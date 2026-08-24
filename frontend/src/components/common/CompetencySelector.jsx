function CompetencySelector({ options, values, setValues }) {

  const addCompetency = (title) => {
    setValues([
      ...values,
      { title, description: "", weight: 0 }
    ]);
  };

  const updateWeight = (index, value) => {
    const updated = [...values];
    updated[index].weight = value;
    setValues(updated);
  };

  return (
    <div className="space-y-3">

      <select
        onChange={(e) => addCompetency(e.target.value)}
        className="border p-2 rounded w-full"
      >
        <option>Select competency</option>
        {options.map(c => (
          <option key={c}>{c}</option>
        ))}
      </select>

      {values.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">

          <span className="flex-1">{item.title}</span>

          <button onClick={()=>updateWeight(i,item.weight-5)}>-</button>

          <input
            type="number"
            value={item.weight}
            onChange={(e)=>updateWeight(i,e.target.value)}
            className="w-16 border text-center"
          />

          <button onClick={()=>updateWeight(i,item.weight+5)}>+</button>

        </div>
      ))}

    </div>
  );
}