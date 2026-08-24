from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.models import User
from app.repository import jd_assignment_repository as assign_repo
from app.repository import jd_workflow_repository as wf_repo
from app.services.jd_assignment_service import _snapshot_from_jd
from app.core.exceptions import NotFoundError,ConflictError,ForbiddenError,AppValidationError
from app.repository import jd_repository as jd_repo



def _resolved_step(user: User, *, step_name: str, sla_days: int, step_order: int) -> dict:
    """Build the full resolved-step dict stored in JDWorkflowRun.resolved_steps."""
    return {
        "step_order": step_order,
        "step_name": step_name,
        "user_id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "sla_days": sla_days,
        "color_code": user.color_code,
    }


def _trail_entry(user: User, *, decision: str, comment: str, step_index: int) -> dict:
    return {
        "step_index": step_index,
        "user_id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "color_code": user.color_code,
        "decision": decision,   # "triggered" | "approved" | "declined"
        "comment": comment,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

async def _get_active_run_or_raise(db: AsyncSession, *, jd_id: UUID, org_id: UUID):
    run = await wf_repo.get_active_run_for_jd(db, jd_id=jd_id, org_id=org_id)
    if not run:
        raise NotFoundError("No active workflow run found for this JD. ")
    return run

from sqlalchemy import select
from app.models.models import CandidateJDAssignment

async def _resolve_workflow_jd_id(db: AsyncSession, jd_id: UUID) -> UUID:
    stmt = select(CandidateJDAssignment.jd_id).where(CandidateJDAssignment.id == jd_id)
    res = await db.execute(stmt)
    resolved_id = res.scalar_one_or_none()
    return resolved_id if resolved_id else jd_id

async def _get_any_run_or_raise(db: AsyncSession, *, jd_id: UUID, org_id: UUID):
    effective_id = await _resolve_workflow_jd_id(db, jd_id)
    run = await wf_repo.get_any_run_for_jd(db, jd_id=effective_id, org_id=org_id)
    if not run:
        raise NotFoundError("No workflow run found for this JD. A workflow must be started first before checking its status.")
    return run

async def _get_jd_or_raise(db: AsyncSession, *, jd_id: UUID, org_id: UUID):
    effective_id = await _resolve_workflow_jd_id(db, jd_id)
    jd = await wf_repo.get_jd_in_org(db, jd_id=effective_id, org_id=org_id)
    if not jd:
        raise NotFoundError("JD not found in your organisation.")
    return jd

class JDWorkflowService:

    async def search_members(self, db: AsyncSession, *, query: str | None, current_user: User, skip: int = 0, limit: int = 100) -> dict:
        members = await wf_repo.search_org_members(db, org_id=current_user.org_id, query=query, skip=skip, limit=limit)
        return {
            "members": [
                {
                    "user_id": str(m.id),
                    "full_name": m.full_name,
                    "email": m.email,
                    "role": m.role,
                    "color_code": m.color_code,
                }
                for m in members
            ]
        }

    async def list_workflows(self, db: AsyncSession, *, current_user: User) -> dict:
        workflows = await wf_repo.list_workflows_for_org(db, org_id=current_user.org_id)
        return {
            "workflows": [
                {
                    "workflow_id": str(wf.id),
                    "name": wf.name,
                    "steps": wf.steps,
                    "is_draft": wf.is_draft,
                    "is_active": wf.is_active,
                    "created_at": wf.created_at,
                }
                for wf in workflows
            ]
        }


    async def get_run_status(self, db: AsyncSession, *, jd_id: UUID, current_user: User) -> dict:
        run = await _get_any_run_or_raise(db, jd_id=jd_id, org_id=current_user.org_id)
        steps = run.resolved_steps or []
        current_step = steps[run.current_step_index] if 0 <= run.current_step_index < len(steps) else None
        
        if run.status == "completed":
            current_step = None
        
        # Always fetch version_history from the main JD (run.jd_id) so it's always complete
        main_jd = await wf_repo.get_jd_in_org(db, jd_id=run.jd_id, org_id=current_user.org_id)
        full_version_history = list(main_jd.version_history or []) if main_jd else []
        
        return {
            "run_id": str(run.id),
            "jd_id": str(run.jd_id),
            "status": run.status,
            "current_step_index": run.current_step_index,
            "current_approver": current_step,
            "total_steps": len(steps),
            "resolved_steps": steps,
            "comments_trail": run.comments_trail or [],
            "current_jd_version_id": str(run.current_jd_version_id) if run.current_jd_version_id else None,
            "version_history": full_version_history,
        }


    async def create_workflow(self,db: AsyncSession,*,name: str,steps_input: list[dict], is_draft: bool,current_user: User) -> dict:
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can create workflows.")
        if not steps_input:
            raise AppValidationError("At least one step is required.")

        # Validation: Check for duplicate users in workflow steps
        user_ids = [step["user_id"] for step in steps_input]
        seen_users = set()
        for user_id in user_ids:
            if user_id in seen_users:
                raise AppValidationError("Cannot assign the same person to approve twice in a single workflow. Please ensure each user is only assigned to one step.")
            seen_users.add(user_id)

        resolved: list[dict] = []
        for order, step in enumerate(steps_input, start=1):
            user = await wf_repo.get_user_by_id_in_org(db, user_id=step["user_id"], org_id=current_user.org_id)
            if not user:
                raise NotFoundError(f"Step {order}: user not found in your organisation. Search by name or email and pick a valid member.")
            resolved.append(_resolved_step(user,step_name=step.get("step_name", f"Step {order}"),sla_days=step.get("sla_days", 1),step_order=order))

        wf = await wf_repo.create_workflow(db,org_id=current_user.org_id,created_by=current_user.id,name=name,steps=resolved,is_draft=is_draft)
        return {
            "workflow_id": str(wf.id),
            "name": wf.name,
            "steps": wf.steps,
            "is_draft": wf.is_draft,
            "message": "Workflow saved as draft." if is_draft else "Workflow created successfully.",
        }


    async def update_workflow(self, db: AsyncSession, *, workflow_id: UUID, name: str | None,steps_input: list[dict] | None,is_draft: bool | None,current_user: User) -> dict:
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can update workflows.")

        wf = await wf_repo.get_workflow_by_id(db, workflow_id=workflow_id, org_id=current_user.org_id)
        if not wf:
            raise NotFoundError("Workflow not found in your organisation.")

        resolved_steps: list[dict] | None = None
        if steps_input is not None:
            if not steps_input:
                raise AppValidationError("At least one step is required.")

            user_ids = [step["user_id"] for step in steps_input]
            seen_users = set()
            for user_id in user_ids:
                if user_id in seen_users:
                    raise AppValidationError("Cannot assign the same person to approve twice in a single workflow. Please ensure each user is only assigned to one step.")
                seen_users.add(user_id)

            resolved_steps = []
            for order, step in enumerate(steps_input, start=1):
                user = await wf_repo.get_user_by_id_in_org(db, user_id=step["user_id"], org_id=current_user.org_id)
                if not user:
                    raise NotFoundError(f"Step {order}: user not found in your organisation. Search by name or email and pick a valid member.")
                resolved_steps.append(
                    _resolved_step(user,step_name=step.get("step_name", f"Step {order}"),
                        sla_days=step.get("sla_days", 1),step_order=order))

        updated = await wf_repo.update_workflow(db, wf=wf, name=name, steps=resolved_steps, is_draft=is_draft)
        return {
            "workflow_id": str(updated.id),
            "name": updated.name,
            "steps": updated.steps,
            "is_draft": updated.is_draft,
            "is_active": updated.is_active,
            "message": "Workflow updated successfully.",
        }


    async def delete_workflow(self, db: AsyncSession, *, workflow_id: UUID, current_user: User) -> dict:
        if current_user.role != "Admin":
            raise ForbiddenError("Only Admins can delete workflows.")
        wf = await wf_repo.get_workflow_by_id(db, workflow_id=workflow_id, org_id=current_user.org_id)
        if not wf:
            raise NotFoundError("Workflow not found in your organisation.")
        await wf_repo.deactivate_workflow(db, wf=wf)
        return {"message": f"Workflow '{wf.name}' has been deactivated."}


    async def trigger_workflow(self,db: AsyncSession,*,jd_id: UUID,workflow_id: UUID,comment: str,current_user: User) -> dict:
        # No duplicate active runs
        existing = await wf_repo.get_active_run_for_jd(db, jd_id=jd_id, org_id=current_user.org_id)
        if existing:
            raise ConflictError("This JD already has an active workflow in progress. The current approver must decide first before a new one can be triggered.")

        wf = await wf_repo.get_workflow_by_id(db, workflow_id=workflow_id, org_id=current_user.org_id)
        if not wf:
            raise NotFoundError("Workflow not found in your organisation.")
        if wf.is_draft:
            raise AppValidationError("This workflow is still a draft. Ask an Admin to publish it before using it.")
        if not wf.steps:
            raise AppValidationError("This workflow has no steps defined.")

        jd = await _get_jd_or_raise(db, jd_id=jd_id, org_id=current_user.org_id)

        # Update JD status to in_review when workflow starts
        await jd_repo.update_jd_status(db, jd_id, "in_review", org_id=current_user.org_id)

        # Re-validate all step users still exist in the org
        resolved_steps: list[dict] = []
        for step in wf.steps:
            user = await wf_repo.get_user_by_id_in_org(db, user_id=UUID(step["user_id"]), org_id=current_user.org_id)
            if not user:
                raise NotFoundError(f"Step '{step.get('step_name', '')}': reviewer "f"'{step.get('full_name', step['user_id'])}' is no longer active in your organisation.")
            resolved_steps.append(
                _resolved_step(user,step_name=step.get("step_name", f"Step {step['step_order']}"),sla_days=step.get("sla_days", 1),step_order=step.get("step_order", 1)))

        initial_trail = [
            _trail_entry(current_user, decision="triggered", comment=comment, step_index=-1)
        ]

        run = await wf_repo.create_workflow_run(db,org_id=current_user.org_id,jd_id=jd_id,workflow_id=wf.id,initiated_by=current_user.id,resolved_steps=resolved_steps,comments_trail=initial_trail)

        first_step = resolved_steps[0]
        # Versioning: Create the first clone for User 1
        clone = await jd_repo.clone_jd_for_versioning(db, jd, UUID(first_step['user_id']))
        # Update Main JD's version history
        jd_history = list(jd.version_history or [])
        jd_history.append({'version': len(jd_history) + 1, 'jd_id': str(clone.id), 'user_id': first_step['user_id'], 'step_index': 0})
        jd.version_history = jd_history
        flag_modified(jd, 'version_history')
        
        # Also sync to the clone
        clone.version_history = jd_history
        flag_modified(clone, 'version_history')
        
        run.current_jd_version_id = clone.id
        await wf_repo.update_run(db, run=run, current_step_index=run.current_step_index, status=run.status, comments_trail=run.comments_trail, current_jd_version_id=clone.id)

        await assign_repo.insert_assigned_jd_leg(db,org_id=current_user.org_id,original_jd_id=jd.id,jd_snapshot=_snapshot_from_jd(jd),
            sent_from=current_user.id,sent_to=UUID(first_step["user_id"]),comment=comment)

        return {
            "run_id": str(run.id),
            "jd_id": str(jd_id),
            "workflow_name": wf.name,
            "total_steps": len(resolved_steps),
            "sent_to": first_step,
            "comments_trail": run.comments_trail,
            "message": (
                f"Workflow '{wf.name}' started. "
                f"JD sent to {first_step['full_name']} ({first_step['email']}) "
                f"for '{first_step['step_name']}'."
            ),
        }


    async def bulk_trigger_workflow(self, db: AsyncSession, *, jd_ids: list[UUID], workflow_id: UUID, comment: str, current_user: User) -> dict:
        """Trigger a workflow on multiple JDs with final status — assign them all to the same workflow."""
        # Validate workflow exists and is not draft
        wf = await wf_repo.get_workflow_by_id(db, workflow_id=workflow_id, org_id=current_user.org_id)
        if not wf:
            raise NotFoundError("Workflow not found in your organisation.")
        if wf.is_draft:
            raise AppValidationError("This workflow is still a draft. Ask an Admin to publish it before using it.")
        if not wf.steps:
            raise AppValidationError("This workflow has no steps defined.")

        # Re-validate all step users still exist in the org
        resolved_steps: list[dict] = []
        for step in wf.steps:
            user = await wf_repo.get_user_by_id_in_org(db, user_id=UUID(step["user_id"]), org_id=current_user.org_id)
            if not user:
                raise NotFoundError(f"Step '{step.get('step_name', '')}': reviewer '{step.get('full_name', step['user_id'])}' is no longer active in your organisation.")
            resolved_steps.append(
                _resolved_step(user, step_name=step.get("step_name", f"Step {step['step_order']}"), sla_days=step.get("sla_days", 1), step_order=step.get("step_order", 1)))

        # Process each JD
        successful_jds = []
        failed_jds = []
        errors = []

        for jd_id in jd_ids:
            try:
                # Check if JD exists and has final status
                jd = await _get_jd_or_raise(db, jd_id=jd_id, org_id=current_user.org_id)
                
                if jd.status != "final":
                    errors.append({
                        "jd_id": str(jd_id),
                        "error": f"JD status is '{jd.status}', expected 'final'"
                    })
                    failed_jds.append(str(jd_id))
                    continue

                # Check for existing active workflow run
                existing = await wf_repo.get_active_run_for_jd(db, jd_id=jd_id, org_id=current_user.org_id)
                if existing:
                    errors.append({
                        "jd_id": str(jd_id),
                        "error": "JD already has an active workflow in progress"
                    })
                    failed_jds.append(str(jd_id))
                    continue

                # Update JD status to in_review
                await jd_repo.update_jd_status(db, jd_id, "in_review", org_id=current_user.org_id)

                # Create workflow run
                initial_trail = [_trail_entry(current_user, decision="triggered", comment=comment, step_index=-1)]
                run = await wf_repo.create_workflow_run(
                    db, org_id=current_user.org_id, jd_id=jd_id, workflow_id=wf.id,
                    initiated_by=current_user.id, resolved_steps=resolved_steps, comments_trail=initial_trail
                )

                # Versioning: Create the first clone for User 1
                first_step = resolved_steps[0]
                clone = await jd_repo.clone_jd_for_versioning(db, jd, UUID(first_step['user_id']))
                jd_history = list(jd.version_history or [])
                jd_history.append({'version': len(jd_history) + 1, 'jd_id': str(clone.id), 'user_id': first_step['user_id'], 'step_index': 0})
                jd.version_history = jd_history
                flag_modified(jd, 'version_history')
                
                # Also sync to the clone
                clone.version_history = jd_history
                flag_modified(clone, 'version_history')
                
                run.current_jd_version_id = clone.id
                await wf_repo.update_run(db, run=run, current_step_index=run.current_step_index, status=run.status, comments_trail=run.comments_trail, current_jd_version_id=clone.id)

                # Create assignment for first step
                await assign_repo.insert_assigned_jd_leg(
                    db, org_id=current_user.org_id, original_jd_id=jd.id, jd_snapshot=_snapshot_from_jd(jd),
                    sent_from=current_user.id, sent_to=UUID(first_step["user_id"]), comment=comment
                )

                successful_jds.append({
                    "jd_id": str(jd_id),
                    "run_id": str(run.id),
                    "sent_to": first_step
                })

            except Exception as e:
                errors.append({
                    "jd_id": str(jd_id),
                    "error": str(e)
                })
                failed_jds.append(str(jd_id))

        return {
            "workflow_name": wf.name,
            "total_submitted": len(jd_ids),
            "successful": len(successful_jds),
            "failed": len(failed_jds),
            "successful_jds": successful_jds,
            "failed_jds": failed_jds,
            "errors": errors,
            "message": f"Workflow '{wf.name}' triggered for {len(successful_jds)} JDs. {len(failed_jds)} failed."
        }


    async def process_decision(self,db: AsyncSession,*,jd_id: UUID,decision: str,comment: str,current_user: User) -> dict:
        decision = decision.strip().lower()
        if decision not in ("approved", "declined"):
            raise AppValidationError("decision must be 'approved' or 'declined'.")

        run = await _get_active_run_or_raise(db, jd_id=jd_id, org_id=current_user.org_id)
        steps = run.resolved_steps
        idx = run.current_step_index

        if idx < 0 or idx >= len(steps):
            raise ConflictError("Workflow is in an invalid state. Please contact support.")

        # Validate it is this user's turn
        expected_user_id = UUID(steps[idx].get("delegated_to_user_id") or steps[idx]["user_id"])
        if current_user.id != expected_user_id:
            expected_name = steps[idx].get("delegated_to_name") or steps[idx]["full_name"]
            expected_email = steps[idx].get("delegated_to_email") or steps[idx]["email"]
            raise ForbiddenError(
                f"It is not your turn to decide. "
                f"'{steps[idx]['step_name']}' is awaiting action from "
                f"{expected_name} ({expected_email})."
            )

        current_leg = await assign_repo.get_current_assignment_leg(db, jd_id=jd_id, user_id=current_user.id, org_id=current_user.org_id)
        if not current_leg:
            raise NotFoundError("No pending assignment leg found for this JD. The step may have already been processed.")

        await assign_repo.update_assigned_leg_status(db, leg=current_leg, status=decision, comment=comment)

        jd = await _get_jd_or_raise(db, jd_id=jd_id, org_id=current_user.org_id)

        # Append to trail
        updated_trail = list(run.comments_trail or [])
        updated_trail.append(_trail_entry(current_user, decision=decision, comment=comment, step_index=idx))

        if decision == "approved":
            next_idx = idx + 1

            if next_idx < len(steps):
                next_step = steps[next_idx]
                # Versioning: Clone current version for the next reviewer
                current_clone = await jd_repo.get_jd_by_id(db, run.current_jd_version_id)
                next_clone = await jd_repo.clone_jd_for_versioning(db, current_clone, UUID(next_step['user_id']))
                jd_history = list(jd.version_history or [])
                jd_history.append({'version': len(jd_history) + 1, 'jd_id': str(next_clone.id), 'user_id': next_step['user_id'], 'step_index': next_idx})
                jd.version_history = jd_history
                flag_modified(jd, 'version_history')
                
                # Also sync to next clone
                next_clone.version_history = jd_history
                flag_modified(next_clone, 'version_history')
                
                run.current_jd_version_id = next_clone.id
                await wf_repo.update_run(db, run=run, current_step_index=next_idx, status="active", comments_trail=updated_trail, current_jd_version_id=next_clone.id)

                await assign_repo.insert_assigned_jd_leg(db,org_id=current_user.org_id,original_jd_id=jd.id,
                    jd_snapshot=current_leg.jd_snapshot,sent_from=current_user.id,sent_to=UUID(next_step["user_id"]),
                    comment=comment)
                return {
                    "jd_id": str(jd_id),
                    "decision": "approved",
                    "step_completed": steps[idx]["step_name"],
                    "forwarded_to": next_step,
                    "comments_trail": updated_trail,
                    "message": (
                        f"'{steps[idx]['step_name']}' approved by "
                        f"{current_user.full_name} ({current_user.role}). "
                        f"Forwarded to {next_step['full_name']} ({next_step['email']}) "
                        f"for '{next_step['step_name']}'."
                    ),
                }

            # Last step — DO NOT auto-merge clone content into the Main JD.
            # Admins must perform an explicit manual merge from the UI.
            # Preserve the clone/version history so Admin can review/merge later.
            # Previously the code copied clone fields into `jd` and called
            # `wf_repo.finalize_jd` which cleared clones; that behavior is
            # intentionally disabled to avoid automatic master updates.
            # Instead, mark the JD as finalized (status/timestamps) without
            # modifying main content or clearing version history.
            # Set status to 'approved' so the JD isn't finalized automatically.
            jd.status = "approved"
            jd.updated_at = datetime.now(timezone.utc)
            # Commit the status update without clearing the version history
            await jd_repo.update_jd_status_and_content(db, jd=jd)
            await wf_repo.update_run(db, run=run, current_step_index=idx,status="completed", comments_trail=updated_trail)
            return {
                "jd_id": str(jd_id),
                "decision": "approved",
                "jd_status": jd.status,
                "comments_trail": updated_trail,
                "message": (
                    f"'{steps[idx]['step_name']}' approved by "
                    f"{current_user.full_name} ({current_user.role}). "
                    "All steps complete - JD approved successfully."
                ),
            }

        # Handle declined decisions — always return to workflow initiator (never previous step)
        await jd_repo.update_jd_status(db, jd_id, "declined", org_id=current_user.org_id)


        await assign_repo.insert_assigned_jd_leg(
            db,
            org_id=current_user.org_id,
            original_jd_id=jd.id,
            jd_snapshot=current_leg.jd_snapshot,
            sent_from=current_user.id,
            sent_to=run.initiated_by,
            comment=comment,
            status="returned",
        )
        await wf_repo.update_run(
            db,
            run=run,
            current_step_index=-1,
            status="returned_to_initiator",
            comments_trail=updated_trail,
        )
        return {
            "jd_id": str(jd_id),
            "decision": "declined",
            "jd_status": "declined",
            "returned_to": {"user_id": str(run.initiated_by), "label": "Initiator"},
            "comments_trail": updated_trail,
            "message": (
                f"'{steps[idx]['step_name']}' declined by "
                f"{current_user.full_name} ({current_user.role}). "
                "JD returned to the workflow initiator. "
                "They must re-trigger the workflow to restart the approval chain."
            ),
        }


    async def delegate_workflow_step(self, db: AsyncSession, *, jd_id: UUID, delegate_to_email: str, comment: str, current_user: User) -> dict:
        run = await _get_active_run_or_raise(db, jd_id=jd_id, org_id=current_user.org_id)
        steps = list(run.resolved_steps)
        idx = run.current_step_index

        if idx < 0 or idx >= len(steps):
            raise ConflictError("Workflow is in an invalid state. Please contact support.")

        # Validate it is this user's turn
        expected_user_id = UUID(steps[idx].get("delegated_to_user_id") or steps[idx]["user_id"])
        if current_user.id != expected_user_id:
            raise ForbiddenError(
                f"It is not your turn to decide. "
                f"'{steps[idx]['step_name']}' is awaiting action from "
                f"{steps[idx].get('delegated_to_name') or steps[idx]['full_name']} "
                f"({steps[idx].get('delegated_to_email') or steps[idx]['email']})."
            )

        delegate_user = await wf_repo.get_user_by_email_in_org(db, email=delegate_to_email, org_id=current_user.org_id)
        if not delegate_user:
            raise NotFoundError(f"User with email '{delegate_to_email}' not found in your organisation.")

        # Ensure the user isn't delegating to themselves
        if delegate_user.id == current_user.id:
            raise AppValidationError("You cannot delegate the task to yourself.")

        # Constraints verification: delegate must be a Manager
        if delegate_user.role != "Manager":
            raise AppValidationError("You can only delegate tasks to a Manager.")

        # Validation: Check if delegate is already in the workflow (as original user or delegated user)
        for step in steps:
            if str(delegate_user.id) == step.get("user_id") or str(delegate_user.id) == step.get("delegated_to_user_id"):
                raise AppValidationError(f"'{delegate_user.full_name}' is already assigned in this workflow. "f"Cannot assign the same person to approve twice in a single workflow.")

        current_leg = await assign_repo.get_current_assignment_leg(db, jd_id=jd_id, user_id=current_user.id, org_id=current_user.org_id)
        if not current_leg:
            raise NotFoundError("No pending assignment leg found for this JD. The step may have already been processed.")

        # 1. Update current leg status to forward_for_approval
        await assign_repo.update_assigned_leg_status(db, leg=current_leg, status="forward_for_approval", comment=comment)

        # 2. Insert new assigned leg for the delegate
        await assign_repo.insert_assigned_jd_leg(db,org_id=current_user.org_id,original_jd_id=jd_id,jd_snapshot=current_leg.jd_snapshot,
            sent_from=current_user.id,sent_to=delegate_user.id,comment=comment,status="waiting_for_approval")

        # 3. Update the resolved_steps in JDWorkflowRun with delegate info
        steps[idx]["delegated_to_user_id"] = str(delegate_user.id)
        steps[idx]["delegated_to_name"] = delegate_user.full_name
        steps[idx]["delegated_to_email"] = delegate_user.email
        
        # Add to comments trail
        updated_trail = list(run.comments_trail or [])
        updated_trail.append(_trail_entry(current_user, decision="delegated", comment=comment, step_index=idx))

        # Re-assign JSONB lists
        await wf_repo.update_run(db, run=run, current_step_index=idx, status="active", comments_trail=updated_trail)
        # Using SQLAlchemy JSON mutation directly won't trigger update unless we flag_modified, 
        # so we ensure it's set on the object:
        await wf_repo.update_run(db, run=run, current_step_index=idx, status="active", comments_trail=updated_trail, resolved_steps=steps)

        return {
            "jd_id": str(jd_id),
            "decision": "delegated",
            "delegated_to": {
                "user_id": str(delegate_user.id),
                "full_name": delegate_user.full_name,
                "email": delegate_user.email
            },
            "comments_trail": updated_trail,
            "message": f"Task delegated successfully to {delegate_user.full_name}."
        }


jd_workflow_service = JDWorkflowService()



