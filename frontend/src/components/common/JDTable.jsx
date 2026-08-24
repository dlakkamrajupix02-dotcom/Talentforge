import JDRow from "./JDRow";

export default function JDTable({ jds }) {

  return (
    <div className="space-y-3">

      {jds.map((jd) => (
        <JDRow key={jd.id} jd={jd} />
      ))}

    </div>
  );
}