# Technical Change Summary: Template Normalization & Workflow Delegation

This document summarizes the recent architectural and feature enhancements made to the AirFlow backend and frontend systems, focusing on Template/JD alignment and the new Workflow Delegation feature.

---

## 1. Template & JD Schema Normalization
**Objective**: Achieve 100% structural alignment between the Job Description (JD) system and the Template management system.

### Key Changes
- **Nested Content Structure**: Refactored the `Template` model and associated schemas (`PublicTemplateCreate`, `PublicTemplateUpdate`, `PublicTemplateResponse`) to use a nested `content` dictionary. This dictionary now mirrors the exact structure of the `JobDescription` system.
- **Source of Truth**: The output of `/job_descriptions/generate` is now the reference format for all templates.
- **Weighted Item Parity**: Renamed `WeightedItem.name` to `WeightedItem.point` across the application to match JD payload expectations.
- **Automatic Normalization**: Added Pydantic `model_validators` to template schemas to automatically transform legacy "flat" payloads into the new nested structure, ensuring backward compatibility for the frontend while enforcing strict storage standards.
- **Direct Instantiation**: Updated `POST /templates/public/{template_id}/use` to create a JD directly from template content without AI intervention, returning a 100% JD-compatible response.

### Impacted Files
- `app/schemas/schemas.py`: Updated `WeightedItem`, `JDContentSchema`, and template request/response models.
- `app/routers/template_routes.py`: Refactored creation, update, and usage logic.
- `app/models/models.py`: Underlying database structure for Templates and JDs.

---

## 2. Sequential Workflow Delegation
**Objective**: Allow approvers in a sequential workflow to delegate their approval task to another manager at runtime.

### Key Changes
- **Email-Based Selection**: Updated the delegation API to accept `delegate_to_email` instead of internal user IDs, improving user experience and security.
- **Manager Validation**: Implemented strict backend validation to ensure delegates exist in the same organization and possess the 'Manager' role.
- **Workflow Integrity**: Delegated users do NOT become part of the static workflow definition. Delegation happens at the task level (runtime only).
- **Audit Trail**: Enhanced the `comments_trail` and `resolved_steps` to track both the original approver and the active delegate for each step.
- **Delegation Chain**: Support for recursive delegation (a delegate can further delegate the task).

### Impacted Files
- `app/routers/jd_workflow_routes.py`: Updated `POST /{jd_id}/delegate` endpoint.
- `app/services/jd_workflow_service.py`: Core logic for resolving delegates and updating assignment legs.
- `app/repository/jd_workflow_repository.py`: Added email-based user lookup utilities.
- `app/schemas/schemas.py`: Updated `DelegateStepRequest`.

---

## 3. Frontend & Infrastructure Enhancements
- **Session Management**: Implemented a 12-hour hard session limit and a 2-hour sliding window token refresh logic in `JDContext.jsx`.
- **Workflow UI Protection**: Added duplicate reviewer detection and field validation in the Admin Settings to prevent invalid workflow configurations.
- **Dynamic Image Loading**: Enhanced image rendering to handle both absolute and relative URLs via the backend `BASE_URL`.
- **Error Handling**: Improved `apiClient.js` to automatically clear local storage and redirect to login on 401 (Unauthorized/Expired) responses.

---

## Conclusion
These changes significantly improve the system's maintainability by unifying data structures and providing a more flexible, secure approval process for managers.
