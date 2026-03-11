import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

export default function GraficaMensual({ series }) {
  if (!series || series.length === 0)
    return (
      <div className="p-4 text-sm text-gray-400">
        Selecciona un punto para ver la serie temporal.
      </div>
    );

  // 👉 1 punto ≈ 20px (ajustable)
  const chartWidth = Math.max(series.length * 20, 800);

  return (
    <div className="w-full h-full p-4 flex flex-col bg-gradient-to-b from-slate-900/80 to-slate-900/40 rounded-2xl">
      <h3 className="text-lg font-semibold mb-2">
        Serie de Evapotranspiración
      </h3>

      {/* CONTENEDOR SCROLLEABLE */}
      <div className="w-full h-full overflow-x-auto overflow-y-hidden scroll-minimal">
  <div style={{ width: chartWidth }}>
        <LineChart
          width={chartWidth}
          height={window.innerWidth < 640 ? 100 : 120}
          data={series}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <XAxis
  dataKey="label"
  tick={{ fontSize: 10 }}
  interval={window.innerWidth < 640 ? 23 : 11}
/>

          <YAxis />
          <Tooltip
            formatter={(value) =>
              value ? `${value.toFixed(2)} mm/día` : "N/A"
            }
          />
          <Line
            type="monotone"
            dataKey="ET"
            stroke="#38bdf8"
            strokeWidth={2.5}
            dot={false}          // 🔥 CLAVE para performance
            isAnimationActive={false} // 🔥 MUY IMPORTANTE
          />
        </LineChart>
        </div>
      </div>
    </div>
  );
}
