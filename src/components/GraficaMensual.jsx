import { ComposedChart, Line, XAxis, YAxis, Tooltip, Area, ResponsiveContainer } from "recharts";

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
      <div className="flex-1 w-full overflow-x-auto overflow-y-hidden scroll-minimal">
        <div style={{ width: chartWidth }} className="h-full">

          <ResponsiveContainer width="100%" height="100%">

            <ComposedChart
              data={series}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >

              {/* DEGRADADO */}
              <defs>
                <linearGradient id="etGradient" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.55}/>
  <stop offset="50%" stopColor="#38bdf8" stopOpacity={0.25}/>
  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0}/>
</linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
              />

              <YAxis domain={[0, "auto"]} />

              <Tooltip
                formatter={(value) =>
                  value ? `${value.toFixed(2)} mm/día` : "N/A"
                }
              />

              {/* AREA DEGRADADA */}
              <Area
                type="monotone"
                dataKey="ET"
                fill="url(#etGradient)"
                stroke="none"
                baseValue={0}
                connectNulls
                tooltipType="none"
                fillOpacity={1}
              />

              {/* LINEA */}
              <Line
                type="monotone"
                dataKey="ET"
                stroke="#38bdf8"
                style={{ filter: "drop-shadow(0 0 8px rgba(56,189,248,0.9))" }}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />

            </ComposedChart>

          </ResponsiveContainer>

        </div>
      </div>
    </div>
  );
}
