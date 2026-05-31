"use client";

import { Fragment, useState, type CSSProperties } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { geoMercator, geoCentroid } from "d3-geo";
import { ELEMENT_COLOR, PROVINCE_ELEMENT } from "@/lib/regions";

const PROVINCES = "/maps/provinces.json";
const CITIES = "/maps/cities.json";
const DIM = "#262a33";
const W = 800,
  H = 560;
const NATION: Cfg = { scale: 4350, center: [127.7, 36.0] }; // 줌아웃으로 제주까지 여백 포함 + 균형
const MIN_ZOOM = 1,
  MAX_ZOOM = 8;

// L1 수도권 라벨 겹침 보정 (도 단위, 경도/위도 오프셋)
const L1_OFFSET: Record<string, [number, number]> = {
  "11": [0.0, 0.16], // 서울 ↑
  "23": [-0.24, 0.04], // 인천 ←
  "31": [0.28, -0.5], // 경기 ↘ (서울 클러스터에서 분리)
};

type Cfg = { scale: number; center: [number, number] };
type View = { coordinates: [number, number]; zoom: number };

function shortSido(n: string): string {
  return n
    .replace("특별자치도", "")
    .replace("특별자치시", "")
    .replace("특별시", "")
    .replace("광역시", "")
    .replace("충청북도", "충북")
    .replace("충청남도", "충남")
    .replace("전라북도", "전북")
    .replace("전라남도", "전남")
    .replace("경상북도", "경북")
    .replace("경상남도", "경남")
    .replace("강원도", "강원")
    .replace("경기도", "경기")
    .replace(/도$/, "");
}

// 클릭한 도 경계에 화면을 자동 맞춤 (줌 수치 추측 불필요)
function fitConfig(feature: any): Cfg {
  const proj = geoMercator().fitExtent(
    [
      [24, 24],
      [W - 24, H - 24],
    ],
    feature,
  );
  const c = proj.invert!([W / 2, H / 2]) as [number, number];
  return { scale: proj.scale(), center: c };
}

export default function KoreaMap({
  recommendedElements,
  onSelectProvince,
}: {
  recommendedElements: string[];
  // 도/광역시 선택 시 상위(page)에서 하단 리스트를 그 지역 시·군·구로 교체하는 콜백.
  onSelectProvince?: (province: { code: string; name: string } | null) => void;
  // 시·군·구부터 클릭 비활성화되어 더 이상 사용하지 않지만, 상위 호환을 위해 prop 은 유지.
  onSelectMunicipality?: (
    name: string,
    element: string | undefined,
    provinceName: string,
  ) => void;
}) {
  const [level, setLevel] = useState<1 | 2>(1);
  const [sido, setSido] = useState<{ code: string; name: string } | null>(null);
  const [cfg, setCfg] = useState<Cfg>(NATION);
  const [view, setView] = useState<View>({
    coordinates: NATION.center,
    zoom: 1,
  });

  const fav = (el?: string) => !!el && recommendedElements.includes(el);

  // 호버 효과 없음: default = hover = pressed 동일 스타일.
  function styleFor(el: string | undefined) {
    const favorable = fav(el);
    const color = el ? ELEMENT_COLOR[el] : DIM;
    const base = {
      fill: favorable ? color : DIM,
      stroke: favorable ? "#0f1115" : "#3b4250",
      strokeWidth: 0.5,
      opacity: favorable ? 1 : 0.55,
      outline: "none",
      cursor: level === 1 ? "pointer" : "grab",
    };
    return { default: base, hover: base, pressed: base };
  }

  // onClick 이 있으면 클릭 가능한 라벨(투명 히트영역 포함), 없으면 표시 전용(드래그가 통과).
  function label(
    text: string,
    coords: [number, number],
    favorable: boolean,
    onClick?: () => void,
  ) {
    return (
      <Marker
        coordinates={coords}
        onClick={onClick}
        style={{ default: { cursor: onClick ? "pointer" : "default" } }}
      >
        {onClick && (
          <circle
            r={13}
            fill="transparent"
            style={{ pointerEvents: "all", cursor: "pointer" }}
          />
        )}
        <text
          textAnchor="middle"
          y={3}
          style={{
            fontSize: 9,
            fill: favorable ? "#ffffff" : "#7e8794",
            fontWeight: favorable ? 700 : 500,
            paintOrder: "stroke",
            stroke: "#0c0e12",
            strokeWidth: 1.6,
            pointerEvents: "none",
          }}
        >
          {text}
        </text>
      </Marker>
    );
  }

  function onProvinceClick(geo: any) {
    const c = fitConfig(geo);
    setSido({ code: geo.properties.code, name: geo.properties.name });
    setCfg(c);
    setView({ coordinates: c.center, zoom: 1 });
    setLevel(2);
    onSelectProvince?.({
      code: geo.properties.code,
      name: geo.properties.name,
    });
  }

  function back() {
    setLevel(1);
    setSido(null);
    setCfg(NATION);
    setView({ coordinates: NATION.center, zoom: 1 });
    onSelectProvince?.(null);
  }

  const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
  const zoomBy = (f: number) =>
    setView((v) => ({ ...v, zoom: clampZoom(v.zoom * f) }));

  const caption =
    level === 1
      ? "나와 잘 맞는 지역이 밝게 표시돼요 · 도·광역시를 눌러보세요"
      : `${sido?.name} · 드래그로 이동하고 +/− (또는 손가락)로 확대해서 살펴보세요`;

  const btnStyle: CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 9,
    border: "1px solid var(--line)",
    background: "rgba(20,22,28,0.85)",
    color: "var(--text)",
    fontSize: 18,
    fontWeight: 800,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  };

  return (
    <div>
      <div
        style={{
          position: "relative",
          background: "#0c0e12",
          borderRadius: 14,
          border: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={cfg}
          width={W}
          height={H}
          style={{ width: "100%", height: "auto" }}
        >
          <ZoomableGroup
            center={view.coordinates}
            zoom={view.zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onMoveEnd={(pos: any) =>
              setView({ coordinates: pos.coordinates, zoom: pos.zoom })
            }
          >
            {level === 1 ? (
              <Geographies geography={PROVINCES}>
                {({ geographies }: { geographies: any[] }) => {
                  const paths = geographies.map((geo) => {
                    const el = PROVINCE_ELEMENT[geo.properties.code];
                    return (
                      <Geography
                        key={`p-${geo.rsmKey}`}
                        geography={geo}
                        style={styleFor(el)}
                        onClick={() => onProvinceClick(geo)}
                      />
                    );
                  });
                  const labels = geographies.map((geo) => {
                    const el = PROVINCE_ELEMENT[geo.properties.code];
                    const ctr = geoCentroid(geo) as [number, number];
                    const off = L1_OFFSET[geo.properties.code];
                    const coords: [number, number] = off
                      ? [ctr[0] + off[0], ctr[1] + off[1]]
                      : ctr;
                    return (
                      <Fragment key={`l-${geo.rsmKey}`}>
                        {label(
                          shortSido(geo.properties.name),
                          coords,
                          fav(el),
                          () => onProvinceClick(geo),
                        )}
                      </Fragment>
                    );
                  });
                  return [...paths, ...labels];
                }}
              </Geographies>
            ) : (
              <Geographies geography={CITIES}>
                {({ geographies }: { geographies: any[] }) => {
                  const cities = geographies.filter(
                    (g) => g.properties.provCode === sido?.code,
                  );
                  // 시·군·구는 클릭 비활성화 — 드래그/줌으로만 탐색
                  const paths = cities.map((geo) => {
                    const el = geo.properties.element as string;
                    return (
                      <Geography
                        key={`p-${geo.rsmKey}`}
                        geography={geo}
                        style={styleFor(el)}
                      />
                    );
                  });
                  const labels = cities.map((geo) => (
                    <Fragment key={`l-${geo.rsmKey}`}>
                      {label(
                        geo.properties.name,
                        geoCentroid(geo) as [number, number],
                        fav(geo.properties.element as string),
                      )}
                    </Fragment>
                  ));
                  return [...paths, ...labels];
                }}
              </Geographies>
            )}
          </ZoomableGroup>
        </ComposableMap>

        {level > 1 && (
          <button
            type="button"
            onClick={back}
            style={{
              position: "absolute",
              left: 10,
              top: 10,
              background: "rgba(20,22,28,0.85)",
              color: "var(--text)",
              border: "1px solid var(--line)",
              borderRadius: 9,
              padding: "7px 12px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ←
          </button>
        )}

        <div
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <button
            type="button"
            aria-label="확대"
            onClick={() => zoomBy(1.6)}
            style={btnStyle}
          >
            ＋
          </button>
          <button
            type="button"
            aria-label="축소"
            onClick={() => zoomBy(1 / 1.6)}
            style={btnStyle}
          >
            －
          </button>
        </div>
      </div>
    </div>
  );
}
