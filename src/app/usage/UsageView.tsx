"use client";

import { useState, useEffect } from "react";
import { Check, Search, Users, Coffee, Tag, AlertCircle, Pencil, ChevronDown } from "lucide-react";
import { MAJOR_CATEGORIES, SUB_CATEGORIES, UNCATEGORIZED_LABEL } from "@/lib/categories";
import TimeSelect from "@/components/TimeSelect";

interface UsageLog {
  id: string;
  headCount: number;          // 실제 이용인원
  reservedHeadCount: number;  // 예약 이용인원
  coffeeCount: number;
  purpose: string | null;
  detail: string | null;
}

interface Reservation {
  id: string;
  source: string;
  customerName: string | null;
  startTime: string;
  endTime: string;
  price: number;
  emailId: string | null; // null = 수기 입력
  usageLog: UsageLog | null;
}

export default function UsagePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedResId, setSelectedResId] = useState<string>("");
  const [isSelectOpen, setIsSelectOpen] = useState(false); // 대상선택 커스텀 드롭다운 열림
  const [headCount, setHeadCount] = useState(0); // 실제 이용인원
  const [reserved, setReserved] = useState(0);   // 예약 이용인원 (읽기전용)
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [selectedPurpose, setSelectedPurpose] = useState(""); // 대분류 ("" = 미선택)
  const [detail, setDetail] = useState(""); // 세부내용 자유입력
  const [editDate, setEditDate] = useState("");   // 이용 날짜 (수정)
  const [editStart, setEditStart] = useState(""); // 시작 시간 (수정)
  const [editEnd, setEditEnd] = useState("");     // 종료 시간 (수정)
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/reservations");
      if (res.ok) {
        const data: Reservation[] = await res.json();
        setReservations(data);

        // Find a reservation in progress or closest upcoming, set as initial choice
        if (data.length > 0) {
          // 캘린더에서 더블클릭으로 넘어온 경우 ?selected=<id> 예약을 우선 선택
          const preselectId = typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("selected")
            : null;
          const preselected = preselectId ? data.find((r) => r.id === preselectId) : null;

          const now = new Date();
          const inProgress = data.find((r) => {
            const start = new Date(r.startTime);
            const end = new Date(r.endTime);
            return now >= start && now <= end;
          });

          const defaultRes = preselected || inProgress || data[0];
          setSelectedResId(defaultRes.id);
          setHeadCount(defaultRes.usageLog?.headCount || 2);
          setReserved(defaultRes.usageLog?.reservedHeadCount ?? defaultRes.usageLog?.headCount ?? 0);
          setCoffeeCount(defaultRes.usageLog?.coffeeCount || 0);
          setSelectedPurpose(defaultRes.usageLog?.purpose || "");
          setDetail(defaultRes.usageLog?.detail || "");
          setEditDate(toDateInput(defaultRes.startTime));
          setEditStart(toTimeInput(defaultRes.startTime));
          setEditEnd(toTimeInput(defaultRes.endTime));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReservations();
  }, []);

  const handleSelectionChange = (resId: string) => {
    setSelectedResId(resId);
    const found = reservations.find((r) => r.id === resId);
    if (found) {
      setHeadCount(found.usageLog?.headCount || 2);
      setReserved(found.usageLog?.reservedHeadCount ?? found.usageLog?.headCount ?? 0);
      setCoffeeCount(found.usageLog?.coffeeCount || 0);
      setSelectedPurpose(found.usageLog?.purpose || "");
      setDetail(found.usageLog?.detail || "");
      setEditDate(toDateInput(found.startTime));
      setEditStart(toTimeInput(found.startTime));
      setEditEnd(toTimeInput(found.endTime));
    }
  };

  const handleSave = async () => {
    if (!selectedResId) return alert("기록할 예약을 먼저 선택하세요.");

    if (editDate && editStart && editEnd && editEnd <= editStart) {
      return alert("종료 시간이 시작 시간보다 빨라요. 확인해 주세요.");
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/reservations/${selectedResId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          headCount,          // 실제 이용인원
          reservedHeadCount: reserved,
          coffeeCount,
          purpose: selectedPurpose || null, // 미선택이면 null(미입력)
          detail: detail.trim() || null,
          // 시간 수정
          ...(editDate && editStart ? { startTime: `${editDate}T${editStart}:00` } : {}),
          ...(editDate && editEnd ? { endTime: `${editDate}T${editEnd}:00` } : {}),
        }),
      });

      if (response.ok) {
        setSuccessMsg("이용 기록이 안전하게 저장되었습니다.");
        setTimeout(() => setSuccessMsg(""), 3000);
        // Refresh
        fetchReservations();
      } else {
        alert("이용 기록 저장에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
      alert("서버 연결에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceDisplay = (source: string) => {
    switch (source) {
      case "naver":
        return "네이버";
      case "spacecloud":
        return "스페이스클라우드";
      case "direct":
        return "직접";
      default:
        return "직접";
    }
  };

  // 예약 루트별 글자색 (네이버=초록 / 스페이스클라우드=진한 파랑)
  const sourceTextColor = (source: string) =>
    source === "naver" ? "text-green-600"
    : source === "spacecloud" ? "text-blue-700"
    : "text-slate-500";

  // 한 줄 라벨: 날짜 · 이름 (루트색) (수기)
  const renderResLabel = (res: Reservation) => (
    <span className="flex items-center gap-1 truncate">
      <span className="text-slate-700">{formatDateLabel(res.startTime)} · {res.customerName}</span>
      <span className={`font-bold ${sourceTextColor(res.source)}`}>({getSourceDisplay(res.source)})</span>
      {!res.emailId && <span className="font-bold text-amber-600">✍️ 수기</span>}
    </span>
  );

  // Human readable date string formatting
  const formatDateLabel = (startTimeStr: string) => {
    const d = new Date(startTimeStr);
    const months = d.getMonth() + 1;
    const dates = d.getDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${months}/${dates} ${hours}:${mins}`;
  };

  // ISO → 날짜/시간 입력값 (로컬 기준)
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const toDateInput = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };
  const toTimeInput = (iso: string) => {
    const d = new Date(iso);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  // 분을 00/30으로 자동 보정 (0~29분→00, 30~59분→30)
  const snapHalfHour = (t: string) => {
    if (!t || !t.includes(":")) return t;
    const [h, m] = t.split(":");
    return `${h}:${parseInt(m || "0", 10) < 30 ? "00" : "30"}`;
  };

  // Last 5 modified logs for displaying recent actions safely
  const recentLogs = [...reservations]
    .filter((r) => r.usageLog !== null)
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())
    .slice(0, 5);

  const selectedRes = reservations.find((r) => r.id === selectedResId);

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 max-w-5xl mx-auto w-full">
      <header className="pt-8 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">이용현황 기록</h1>
        <p className="text-sm text-slate-500 mt-1 mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          CCTV 혹은 매장 방문 확인 시 실시간 기입용
        </p>
      </header>

      {/* Main logging form */}
      <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-2">대상 선택</label>
          {isLoading ? (
            <div className="text-sm text-slate-400 py-2">연동 예약 내역을 불러오는 중...</div>
          ) : (
            <div className="relative">
              {/* 현재 선택 표시 버튼 */}
              <button
                type="button"
                onClick={() => setIsSelectOpen((o) => !o)}
                className="w-full flex items-center justify-between gap-2 text-sm p-3.5 rounded-xl border border-slate-200 focus:border-indigo-500 font-semibold bg-white text-slate-800"
              >
                {selectedRes ? renderResLabel(selectedRes) : <span className="text-slate-400">예약을 선택하세요</span>}
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isSelectOpen ? "rotate-180" : ""}`} />
              </button>

              {/* 드롭다운 목록 */}
              {isSelectOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsSelectOpen(false)} />
                  <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1">
                    {reservations.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => { handleSelectionChange(res.id); setIsSelectOpen(false); }}
                        className={`w-full text-left text-sm px-3.5 py-2.5 hover:bg-slate-50 ${res.id === selectedResId ? "bg-indigo-50" : ""}`}
                      >
                        {renderResLabel(res)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 이용 시간 수정 (분은 00/30만) */}
          {selectedRes && (
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">이용 날짜</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">시작</label>
                  <TimeSelect value={editStart} onChange={setEditStart} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">종료</label>
                  <TimeSelect value={editEnd} onChange={setEditEnd} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 인원 컨트롤러: 예약(읽기전용) / 실제(스테퍼) / 추가(스테퍼) + 커피 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 예약 이용인원 - 메일 자동, 읽기전용 */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
              <Users className="w-4 h-4 text-slate-400" />
              예약 인원 <span className="text-[10px] font-medium text-slate-400">(메일)</span>
            </label>
            <div className="flex items-center justify-center bg-slate-100 p-2 rounded-xl border border-slate-200 h-[56px]">
              <span className="text-xl font-bold text-slate-500">{reserved}명</span>
            </div>
          </div>

          {/* 실제 이용인원 - 메인 저장값 */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
              <Users className="w-4 h-4 text-indigo-500" />
              실제 인원
            </label>
            <div className="flex items-center justify-between bg-indigo-50/60 p-2 rounded-xl border border-indigo-100">
              <button
                onClick={() => setHeadCount(Math.max(0, headCount - 1))}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 text-lg hover:bg-slate-50 border border-slate-200 transition active:scale-90"
              >
                -
              </button>
              <span className="text-xl font-bold text-indigo-700">{headCount}명</span>
              <button
                onClick={() => setHeadCount(headCount + 1)}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 text-lg hover:bg-slate-50 border border-slate-200 transition active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* 추가 인원 - 실제 = 예약 초과분. +/- 누르면 실제 인원에 반영 */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
              <Users className="w-4 h-4 text-emerald-500" />
              추가 인원
            </label>
            <div className="flex items-center justify-between bg-emerald-50/60 p-2 rounded-xl border border-emerald-100">
              <button
                onClick={() => setHeadCount(headCount > reserved ? headCount - 1 : headCount)}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 text-lg hover:bg-slate-50 border border-slate-200 transition active:scale-90"
              >
                -
              </button>
              <span className="text-xl font-bold text-emerald-700">+{Math.max(0, headCount - reserved)}명</span>
              <button
                onClick={() => setHeadCount(headCount + 1)}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 text-lg hover:bg-slate-50 border border-slate-200 transition active:scale-90"
              >
                +
              </button>
            </div>
          </div>

          {/* 제공된 커피 */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
              <Coffee className="w-4 h-4 text-amber-500" />
              제공된 커피
            </label>
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
              <button
                onClick={() => setCoffeeCount(Math.max(0, coffeeCount - 1))}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 text-lg hover:bg-slate-50 border border-slate-200 transition active:scale-90"
              >
                -
              </button>
              <span className="text-xl font-bold text-slate-900">{coffeeCount}잔</span>
              <button
                onClick={() => setCoffeeCount(coffeeCount + 1)}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 text-lg hover:bg-slate-50 border border-slate-200 transition active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* 이용 목적 - 대분류 선택 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Tag className="w-4 h-4 text-emerald-500" />
            이용 목적 <span className="text-xs font-medium text-slate-400">(대분류)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {MAJOR_CATEGORIES.map((purpose) => {
              const isSelected = selectedPurpose === purpose;
              return (
                <button
                  type="button"
                  key={purpose}
                  onClick={() => setSelectedPurpose(isSelected ? "" : purpose)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition duration-150 active:scale-95 ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {purpose}
                </button>
              );
            })}
          </div>
        </div>

        {/* 세부내용 - 자유 입력 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Pencil className="w-4 h-4 text-sky-500" />
            세부내용 <span className="text-xs font-medium text-slate-400">(소분류 · 선택 입력)</span>
          </label>

          {/* 대분류별 빠른선택 칩 (누르면 세부내용 자동 입력, 직접 타이핑도 가능) */}
          {selectedPurpose && (SUB_CATEGORIES[selectedPurpose]?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {SUB_CATEGORIES[selectedPurpose].map((sub) => {
                const active = detail === sub;
                return (
                  <button
                    type="button"
                    key={sub}
                    onClick={() => setDetail(active ? "" : sub)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 ${
                      active
                        ? "bg-sky-500 text-white border-sky-500"
                        : "bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100"
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          )}

          <input
            type="text"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={
              selectedPurpose
                ? "위 칩을 누르거나 직접 입력하세요 (예: 보험교육)"
                : "대분류를 먼저 선택하면 추천 소분류가 떠요 (직접 입력도 가능)"
            }
            className="w-full text-sm p-3.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium text-slate-800"
          />
        </div>

        {/* Submit action */}
        <div className="pt-2">
          {successMsg && (
            <p className="text-xs bg-emerald-550/10 text-emerald-600 border border-emerald-100 p-2.5 rounded-lg mb-3 text-center font-bold animate-pulse">
              {successMsg}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition active:scale-[0.98] flex justify-center items-center gap-2"
          >
            <Check className="w-5 h-5" />
            {isSubmitting ? "저장하는 중..." : "이용 현황 저장하기"}
          </button>
        </div>
      </section>

      {/* History Log Feed Section */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          최근 기록 피드
          <Search className="w-4 h-4 text-slate-400" />
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-6 text-slate-400 text-xs">피드를 불러오는 중...</div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">입력된 최근 내역이 없습니다.</div>
          ) : (
            recentLogs.map((log) => {
              const parsedDateStr = formatDateLabel(log.startTime);
              return (
                <div key={log.id} className="p-4 flex justify-between items-center bg-white hover:bg-slate-50/50 transition">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900">
                      {parsedDateStr} ({log.customerName || "미지정"})
                    </p>
                    <p className="text-xs text-slate-500 font-semibold">
                      실제 <span className="text-slate-800">{log.usageLog?.headCount || 1}명</span>
                      {(() => {
                        const r = log.usageLog?.reservedHeadCount ?? 0;
                        const h = log.usageLog?.headCount ?? 0;
                        return r > 0 && r !== h ? <span className="text-slate-400 font-medium"> (예약 {r})</span> : null;
                      })()} · 커피{" "}
                      <span className="text-slate-800">{log.usageLog?.coffeeCount || 0}잔</span> · 목적{" "}
                      <span className="text-indigo-600 font-bold">#{log.usageLog?.purpose || UNCATEGORIZED_LABEL}</span>
                      {log.usageLog?.detail && (
                        <span className="text-slate-400 font-medium"> · {log.usageLog.detail}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {getSourceDisplay(log.source)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
