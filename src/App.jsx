import React, { useMemo, useState } from "react";
import useETdata from "./hooks/useETdata";
import MapaET from "./components/MapaET";
import GraficaMensual from "./components/GraficaMensual";
import PanelDatos from "./components/PanelDatos";
import { useCallback } from "react";
import { CloudRain } from "lucide-react";

export default function App() {
  const { data, loading } = useETdata();

  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  const handlePointClick = (p) => {
    if (!p) return;

    const series = (p.items || [])
      .map(it => ({
        ...it,
        YEAR: Number(it.YEAR),
        Month: Number(it.Month),
      }))
      .sort((a, b) => a.YEAR - b.YEAR || a.Month - b.Month);

    let year = selectedYear ?? series[0]?.YEAR;
    let month = selectedMonth ?? series[0]?.Month;

    let found = series.find(s => s.YEAR === year && s.Month === month);

    if (!found) {
      found = series[0];
      year = found.YEAR;
      month = found.Month;
    }

    setSelectedYear(year);
    setSelectedMonth(month);

    setSelectedPoint({
      ...found,
      LAT: p.LAT,
      LON: p.LON,
      series
    });
  };

  const handleChangeDate = useCallback((year, month) => {
    if (!selectedPoint?.series) return;

    const found = selectedPoint.series.find(
      s => s.YEAR === year && s.Month === month
    );

    if (!found) return;

    setSelectedYear(year);
    setSelectedMonth(month);

    setSelectedPoint(prev => ({
      ...found,
      LAT: prev.LAT,
      LON: prev.LON,
      series: prev.series
    }));
  }, [selectedPoint]);

  const seriesForPlot = useMemo(() => {
    if (!selectedPoint?.series) return [];
    return selectedPoint.series.map((s) => ({
      YEAR: s.YEAR,
      Month: s.Month,
      Mes: s.Mes,
      ET: Number(s.ET_CALCULADA),
      label: `${s.YEAR}-${s.Mes}`,
    }));
  }, [selectedPoint]);

  return (
    <div className="min-h-screen p-6 bg-slate-900 text-slate-100">
      <div className="max-w-[1400px] mx-auto mb-6">
        <div className="
          p-4
          flex
          flex-col
          sm:flex-row
          items-center
          sm:justify-between
          gap-2
          bg-slate-800/60
          rounded-2xl
          shadow
          text-center
          sm:text-left
        ">
          <h1 className="flex items-center gap-3 text-xl font-bold text-blue-300">
            <span className="p-2 rounded-lg bg-blue-500/10">
              <CloudRain className="w-5 h-5 text-blue-400" />
            </span>
            Sistema de visualización de Evapotranspiración
          </h1>
          <div className="text-sm text-gray-400">
            Fuente: NASA POWER • CSV local
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mapa - orden 1 en móvil, fila 1 derecha en desktop */}
        <div className="order-1 lg:order-none col-span-1 lg:col-span-7 bg-slate-800/60 rounded-2xl shadow h-[200px]">
          {loading ? (
            <div className="p-4">Cargando datos...</div>
          ) : (
            <MapaET
              data={data}
              onPointClick={handlePointClick}
              selectedCoords={
                selectedPoint
                  ? { LAT: selectedPoint.LAT, LON: selectedPoint.LON }
                  : null
              }
            />
          )}
        </div>

        {/* Panel de datos - orden 2 en móvil, ocupa 2 filas en desktop */}
        <div className="order-2 lg:order-none col-span-1 lg:col-span-5 lg:row-span-2 lg:-order-1 bg-slate-800/60 rounded-2xl shadow">
          {selectedPoint ? (
            <PanelDatos
              selectedPoint={selectedPoint}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              onChangeDate={handleChangeDate}
            />
          ) : (
            <div className="p-4">
              Selecciona un punto en el mapa para ver datos y series.
            </div>
          )}
        </div>

        {/* Gráfica - orden 3 en móvil, fila 2 derecha en desktop */}
        <div className="order-3 lg:order-none col-span-1 lg:col-span-7 bg-slate-800/60 rounded-2xl shadow h-[240px]">
          <GraficaMensual series={seriesForPlot} />
        </div>
      </div>
    </div>
  );
}
