import { formatJDText } from "../utils/formatJD";
import { useNavigate } from "react-router-dom";

export default function JDRow({ jd }) {

  const navigate = useNavigate();

  const handleExport = () => {

    const text = formatJDText(jd.content);

    const blob = new Blob([text], { type: "text/plain" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = `${jd.title}.txt`;

    a.click();

  };

  const handleEdit = () => {

    navigate("/", {
      state: { jd }
    });

  };

  const handlePush = () => {

    alert(`JD "${jd.title}" pushed to CSOD`);

  };

  return (
    <div className="flex justify-between border p-4 rounded">

      <div>

        <h3 className="font-semibold">
          {jd.title}
        </h3>

        <p className="text-sm text-gray-500">
          Status: {jd.status}
        </p>

      </div>

      <div className="flex gap-2">

        <button
          className="border px-3 py-1"
          onClick={handleEdit}
        >
          Edit
        </button>

        <button
          className="border px-3 py-1"
          onClick={handleExport}
        >
          Export
        </button>

        <button
          className="border px-3 py-1"
          onClick={handlePush}
        >
          Push
        </button>

      </div>

    </div>
  );
}