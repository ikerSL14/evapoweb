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
    <div className="w-full h-full p-4 bg-slate-800/60 rounded-2xl shadow">
      <h3 className="text-lg font-semibold mb-2">
        Serie de Evapotranspiración
      </h3>

      {/* CONTENEDOR SCROLLEABLE */}
      <div className="w-full h-[85%] overflow-x-auto overflow-y-hidden scroll-minimal">
        <LineChart
          width={chartWidth}
          height={210}
          data={series}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval={11} // 👈 muestra solo un label por año
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
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}          // 🔥 CLAVE para performance
            isAnimationActive={false} // 🔥 MUY IMPORTANTE
          />
        </LineChart>
      </div>
    </div>
  );
}
