import React, { useMemo } from "react";

export default function PanelDatos({ selectedPoint, onChangeDate }) {
  const opciones = useMemo(() => {
    if (!selectedPoint?.series) return [];
    return selectedPoint.series.map(s => ({
      value: `${s.YEAR}-${s.Month}`,
      label: `${s.YEAR} ${s.Mes}`
    }));
  }, [selectedPoint]);

  return (
    <div className="p-4 bg-slate-800/60 rounded-2xl shadow space-y-4">
      <div>
        <label className="text-xs text-gray-400">Fecha</label>
        <select
          className="block mt-1 p-2 rounded bg-slate-900 border border-slate-700 text-gray-200"
          onChange={(e) => onChangeDate(e.target.value)}
          defaultValue={`${selectedPoint.YEAR}-${selectedPoint.Month}`}
        >
          {opciones.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Dato label="T2M_MAX" valor={selectedPoint.T2M_MAX} unidad="°C" />
        <Dato label="T2M_MIN" valor={selectedPoint.T2M_MIN} unidad="°C" />
        <Dato label="RAD_ESTIMADA" valor={selectedPoint.RAD_ESTIMADA} unidad="MJ/m²/día" />
        <Dato label="WS2M" valor={selectedPoint.WS2M} unidad="m/s" />
        <Dato label="RH2M" valor={selectedPoint.RH2M} unidad="%" />
        <Dato label="PS" valor={selectedPoint.PS} unidad="kPa" />
        <div className="col-span-2 bg-slate-900/60 p-3 rounded">
          <div className="text-gray-400">ET_CALCULADA</div>
          <div className="text-white font-medium text-2xl">{selectedPoint.ET_CALCULADA ?? "N/A"} mm/día</div>
        </div>
      </div>
    </div>
  );
}

function Dato({ label, valor, unidad }) {
  return (
    <div className="bg-slate-900/60 p-3 rounded">
      <div className="text-gray-400">{label}</div>
      <div className="text-white font-medium">{valor ?? "N/A"} {unidad}</div>
    </div>
  );
}
