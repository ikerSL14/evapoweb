import {useMemo} from "react";
import {
  ThermometerSun,
  ThermometerSnowflake,
  Sun,
  Wind,
  Droplets,
  Gauge,
  Activity
} from "lucide-react";

const MESES = [
  { value: 1, label: "ENE" },
  { value: 2, label: "FEB" },
  { value: 3, label: "MAR" },
  { value: 4, label: "ABR" },
  { value: 5, label: "MAY" },
  { value: 6, label: "JUN" },
  { value: 7, label: "JUL" },
  { value: 8, label: "AGO" },
  { value: 9, label: "SEP" },
  { value: 10, label: "OCT" },
  { value: 11, label: "NOV" },
  { value: 12, label: "DIC" }
];

export default function PanelDatos({ selectedPoint, selectedYear, selectedMonth, onChangeDate }) {

  // ✅ series estable
  const series = useMemo(() => {
    return selectedPoint?.series ?? [];
  }, [selectedPoint]);
  
  // 🔹 Años únicos disponibles
  const years = useMemo(() => {
    return [...new Set(series.map(s => s.YEAR))].sort((a, b) => a - b);
  }, [series]);

  // 🔹 Meses disponibles para el año seleccionado
  const months = useMemo(() => {
    const mesesDisponibles = series
      .filter(s => s.YEAR === selectedYear)
      .map(s => s.Month);

    return MESES.filter(m => mesesDisponibles.includes(m.value));
  }, [series, selectedYear]);

  return (
    <div className="p-4 bg-slate-800/60 rounded-2xl shadow space-y-4">

      {/* SELECTORES */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Año</label>
          <select
            className="block mt-1 w-full p-2 rounded bg-slate-900 border border-slate-700 text-gray-200"
            value={selectedYear}
            onChange={(e) =>
              onChangeDate(Number(e.target.value), selectedMonth)
            }
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400">Mes</label>
          <select
            className="block mt-1 w-full p-2 rounded bg-slate-900 border border-slate-700 text-gray-200 mb-4"
            value={selectedMonth}
            onChange={(e) =>
              onChangeDate(selectedYear, Number(e.target.value))
            }
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DATOS */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Dato
          icon={ThermometerSun}
          label="Temperatura Máxima a 2M"
          valor={selectedPoint.T2M_MAX}
          unidad="°C"
        />

        <Dato
          icon={ThermometerSnowflake}
          label="Temperatura Mínima a 2M"
          valor={selectedPoint.T2M_MIN}
          unidad="°C"
        />

        <Dato
          icon={Sun}
          label="Radiación solar estimada"
          valor={Number(selectedPoint.RAD_ESTIMADA).toFixed(8)}
          unidad="MJ/m²/día"
        />

        <Dato
          icon={Wind}
          label="Velocidad del viento a 2M"
          valor={selectedPoint.WS2M}
          unidad="m/s"
        />

        <Dato
          icon={Droplets}
          label="Humedad relativa a 2M"
          valor={selectedPoint.RH2M}
          unidad="%"
        />

        <Dato
          icon={Gauge}
          label="Presión atmosférica"
          valor={selectedPoint.PS}
          unidad="kPa"
        />

        <div className="col-span-2 bg-slate-900/60 p-3 rounded flex gap-3 items-center mb-7">
          <Activity className="w-6 h-6 text-emerald-400" />
          <div>
            <div className="text-gray-400 text-sm">
              Evapotranspiración calculada
            </div>
            <div className="text-white font-semibold text-2xl">
              {selectedPoint.ET_CALCULADA ?? "N/A"} mm/día
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dato({ icon: Icon, label, valor, unidad }) {
  return (
    <div className="bg-slate-900/60 p-3 rounded flex gap-3 items-center">
      {Icon && <Icon className="w-5 h-5 text-blue-400 shrink-0" />}
      <div>
        <div className="text-gray-400 text-xs">{label}</div>
        <div className="text-white font-medium">
          {valor ?? "N/A"} {unidad}
        </div>
      </div>
    </div>
  );
}
