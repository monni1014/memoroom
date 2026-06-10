"use client";

import { useState, useEffect } from "react";
import { Check, Search, Users, Coffee, Tag, AlertCircle } from "lucide-react";

interface UsageLog {
  id: string;
  headCount: number;
  coffeeCount: number;
  purpose: string | null;
}

interface Reservation {
  id: string;
  source: string;
  customerName: string | null;
  startTime: string;
  endTime: string;
  price: number;
  usageLog: UsageLog | null;
}

export default function UsagePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedResId, setSelectedResId] = useState<string>("");
  const [headCount, setHeadCount] = useState(0);
  const [coffeeCount, setCoffeeCount] = useState(0);
  const [selectedPurpose, setSelectedPurpose] = useState("회의");
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
          const now = new Date();
          const inProgress = data.find((r) => {
            const start = new Date(r.startTime);
            const end = new Date(r.endTime);
            return now >= start && now <= end;
          });

          const defaultRes = inProgress || data[0];
          setSelectedResId(defaultRes.id);
          setHeadCount(defaultRes.usageLog?.headCount || 2);
          setCoffeeCount(defaultRes.usageLog?.coffeeCount || 0);
          setSelectedPurpose(defaultRes.usageLog?.purpose || "기타");
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
      setHeadCount(found.usageLog?.headCount || found.usageLog?.headCount || 2);
      setCoffeeCount(found.usageLog?.coffeeCount || 0);
      setSelectedPurpose(found.usageLog?.purpose || "회의");
    }
  };

  const handleSave = async () => {
    if (!selectedResId) return alert("기록할 예약을 먼저 선택하세요.");

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/reservations/${selectedResId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          headCount,
          coffeeCount,
          purpose: selectedPurpose,
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
        return "네이버 예약";
      case "spacecloud":
        return "스페이스클라우드";
      default:
        return "수동 예약";
    }
  };

  // Human readable date string formatting
  const formatDateLabel = (startTimeStr: string) => {
    const d = new Date(startTimeStr);
    const months = d.getMonth() + 1;
    const dates = d.getDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${months}/${dates} ${hours}:${mins}`;
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
            <select
              value={selectedResId}
              onChange={(e) => handleSelectionChange(e.target.value)}
              className="w-full text-sm p-3.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-semibold bg-white text-slate-800"
            >
              {reservations.map((res) => (
                <option key={res.id} value={res.id}>
                  {formatDateLabel(res.startTime)} · {res.customerName} ({getSourceDisplay(res.source)})
                </option>
              ))}
            </select>
          )}

          {selectedRes && (
            <p className="mt-2 text-xs text-indigo-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100 flex items-center gap-1">
              <span className="font-semibold">이용 시간:</span>
              <span>
                {new Date(selectedRes.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} -{" "}
                {new Date(selectedRes.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </p>
          )}
        </div>

        {/* Guest and Coffee count controllers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
              <Users className="w-4 h-4 text-indigo-500" />
              이용 인원
            </label>
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
              <button
                onClick={() => setHeadCount(Math.max(0, headCount - 1))}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 text-lg hover:bg-slate-50 border border-slate-200 transition active:scale-90"
              >
                -
              </button>
              <span className="text-xl font-bold text-slate-900">{headCount}명</span>
              <button
                onClick={() => setHeadCount(headCount + 1)}
                className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-slate-700 text-lg hover:bg-slate-50 border border-slate-200 transition active:scale-90"
              >
                +
              </button>
            </div>
          </div>

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

        {/* Purpose selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            <Tag className="w-4 h-4 text-emerald-500" />
            이용 목적
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["스터디", "회의", "촬영", "파티", "세미나", "기타"].map((purpose) => {
              const isSelected = selectedPurpose === purpose;
              return (
                <button
                  type="button"
                  key={purpose}
                  onClick={() => setSelectedPurpose(purpose)}
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
                      인원 <span className="text-slate-800">{log.usageLog?.headCount || 1}명</span> · 커피{" "}
                      <span className="text-slate-800">{log.usageLog?.coffeeCount || 0}잔</span> · 목적{" "}
                      <span className="text-indigo-600 font-bold">#{log.usageLog?.purpose || "기타"}</span>
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
