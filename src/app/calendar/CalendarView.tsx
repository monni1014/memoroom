"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Clock, User, Trash2, X, Wallet, RefreshCw, Building2, Copy } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { MAJOR_CATEGORIES, UNCATEGORIZED_LABEL } from "@/lib/categories";
import TimeSelect from "@/components/TimeSelect";

interface UsageLog {
  id: string;
  headCount: number;
  coffeeCount: number;
  purpose: string | null;
  detail: string | null;
}

interface Reservation {
  id: string;
  source: string;
  roomName: string;
  customerName: string | null;
  phone: string | null;
  startTime: string;
  endTime: string;
  price: number;
  discount: number;
  status: string;
  paymentMethod: string | null;
  isPaid: boolean;
  emailId: string | null; // null = 수기 입력 (메일 자동연동 아님)
  usageLog: UsageLog | null;
}

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<string>("all");

  // Form states for manual booking
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("현장카드");
  const [formIsPaid, setFormIsPaid] = useState(true);
  const [formSource, setFormSource] = useState("naver"); // 예약 루트 (네이버/스페이스클라우드)
  const [formRoom, setFormRoom] = useState("머무룸1");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formStartTime, setFormStartTime] = useState("14:00");
  const [formEndTime, setFormEndTime] = useState("17:00");
  const [formPrice, setFormPrice] = useState("30000");
  const [formGuests, setFormGuests] = useState("4");
  const [formPurpose, setFormPurpose] = useState(""); // 대분류
  const [formDetail, setFormDetail] = useState(""); // 세부내용
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/reservations");
      if (res.ok) {
        const data = await res.json();
        setReservations(data);
      }
    } catch (err) {
      console.error("Failed to load reservations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReservations();
    // 1분마다 화면 자동 새로고침 (서버 cron이 받아온 새 예약/취소를 반영)
    const id = setInterval(fetchReservations, 60000);
    return () => clearInterval(id);
  }, []);

  const handleSyncEmails = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/email-sync");
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`✅ ${data.message}`);
        fetchReservations();
      } else {
        setSyncMessage(`❌ 동기화 실패: ${data.error}`);
      }
    } catch (err) {
      setSyncMessage("❌ 메일 서버 연결에 실패했습니다.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // Filter reservations for the selected date and room
  const filteredReservations = roomFilter === "all" 
    ? reservations 
    : reservations.filter((res) => res.roomName === roomFilter);

  const selectedReservations = filteredReservations.filter((res) =>
    isSameDay(new Date(res.startTime), selectedDate)
  );

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return alert("예약자명을 입력하세요.");

    try {
      setIsSubmitting(true);
      const startDateTime = `${formDate}T${formStartTime}:00`;
      const endDateTime = `${formDate}T${formEndTime}:00`;

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: formSource,
          roomName: formRoom,
          customerName: formName,
          phone: formPhone.trim() || null,
          startTime: startDateTime,
          endTime: endDateTime,
          price: parseInt(formPrice, 10) || 0,
          paymentMethod: formPaymentMethod,
          isPaid: formIsPaid,
          headCount: parseInt(formGuests, 10) || 1,
          purpose: formPurpose || null,
          detail: formDetail.trim() || null,
        }),
      });

      if (response.ok) {
        setFormName("");
        setFormPhone("");
        setFormPurpose("");
        setFormDetail("");
        setFormPaymentMethod("현장카드");
        setFormIsPaid(true);
        setFormSource("naver");
        setIsModalOpen(false);
        fetchReservations();
      } else {
        alert("예약 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error("Create booking error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 반복 예약 복사: 해당 예약 정보로 수동 추가 폼을 미리 채워 연다 (날짜만 바꿔 저장)
  const openCopyModal = (res: Reservation) => {
    const s = new Date(res.startTime);
    const e = new Date(res.endTime);
    const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    setFormName(res.customerName || "");
    setFormPhone(res.phone || "");
    setFormSource(res.source === "spacecloud" ? "spacecloud" : "naver");
    setFormRoom(res.roomName || "머무룸1");
    setFormDate(format(s, "yyyy-MM-dd"));
    setFormStartTime(hhmm(s));
    setFormEndTime(hhmm(e));
    setFormPrice(String(res.price || 0));
    // 온라인 결제는 수동 폼에 없으므로 현장카드로 기본 대체
    setFormPaymentMethod(res.paymentMethod === "계좌이체" ? "계좌이체" : "현장카드");
    setFormIsPaid(res.isPaid);
    setFormGuests(String(res.usageLog?.headCount || 1));
    setFormPurpose(res.usageLog?.purpose || "");
    setFormDetail(res.usageLog?.detail || "");
    setIsModalOpen(true);
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: true }),
      });
      if (res.ok) fetchReservations();
      else alert("결제완료 처리에 실패했습니다.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReservation = async (id: string) => {
    if (!confirm("정말로 이 예약을 취소하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchReservations();
      } else {
        alert("예약 취소에 실패했습니다.");
      }
    } catch (err) {
      console.error(err);
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

  const getSourceBadgeStyle = (source: string) => {
    switch (source) {
      case "naver":
        return "bg-green-50 text-green-700 border border-green-100";
      case "spacecloud":
        return "bg-indigo-50 text-indigo-700 border border-indigo-100";
      default:
        return "bg-amber-50 text-amber-700 border border-amber-100";
    }
  };

  const getRoomBadgeStyle = (room: string) => {
    switch (room) {
      case "머무룸1":
        return "bg-sky-50 text-sky-700 border border-sky-100";
      case "머무룸2":
        return "bg-purple-50 text-purple-700 border border-purple-100";
      case "머무룸3":
        return "bg-teal-50 text-teal-700 border border-teal-100";
      default:
        return "bg-slate-50 text-slate-700 border border-slate-100";
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 max-w-7xl mx-auto w-full">
      <header className="pt-8 pb-4 flex justify-between items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">통합 캘린더</h1>
          <p className="text-sm text-slate-500 mt-1">네이버 및 스페이스클라우드 예약 실시간 조회</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSyncEmails}
            disabled={isSyncing}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl shadow-md text-sm font-bold transition-all active:scale-95 whitespace-nowrap",
              isSyncing ? "bg-slate-400 cursor-wait" : "bg-emerald-600 hover:bg-emerald-700",
              "text-white"
            )}
            title="메일 동기화"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            {isSyncing ? "동기화 중..." : "메일 동기화"}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            수동 예약 추가
          </button>
        </div>
      </header>

      {/* Sync Message Toast */}
      {syncMessage && (
        <div className={cn(
          "px-4 py-3 rounded-xl text-sm font-medium shadow-sm border animate-in fade-in slide-in-from-top-2 duration-300",
          syncMessage.startsWith("✅") ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
        )}>
          {syncMessage}
        </div>
      )}

      {/* Room Filter Tabs */}
      <div className="flex gap-2">
        {["all", "머무룸1", "머무룸2"].map((room) => (
          <button
            key={room}
            onClick={() => setRoomFilter(room)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 border",
              roomFilter === room
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {room === "all" ? "전체" : room}
          </button>
        ))}
      </div>

      {/* 데스크톱에서는 달력과 일정 목록을 좌우로 배치 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Calendar Grid Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col">
        {/* Calendar Header Nav */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={prevMonth} className="p-1 rounded-full hover:bg-slate-50 active:scale-95 transition-all">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <h2 className="text-lg font-semibold text-slate-800">
            {format(currentDate, "yyyy년 MM월")}
          </h2>
          <button onClick={nextMonth} className="p-1 rounded-full hover:bg-slate-50 active:scale-95 transition-all">
            <ChevronRight className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Days of Week Row */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
            <div
              key={day}
              className={cn(
                "text-center text-xs font-semibold text-slate-400 py-2",
                idx === 0 && "text-rose-400",
                idx === 6 && "text-blue-400"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days of Month Grid */}
        <div className="grid grid-cols-7 gap-1 flex-1">
          {Array.from({ length: firstDay.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2" />
          ))}
          {daysInMonth.map((day) => {
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);
            const isSameMonthOfActive = isSameMonth(day, currentDate);

            // Filter reservations for this day
            const dayReservations = filteredReservations.filter((res) =>
              isSameDay(new Date(res.startTime), day)
            );

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center justify-between p-1.5 min-h-[55px] rounded-xl relative transition-all active:scale-95",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : isToday
                    ? "bg-indigo-50 text-indigo-700"
                    : "hover:bg-slate-50 text-slate-700",
                  !isSameMonthOfActive && "opacity-30"
                )}
              >
                <span className="text-sm font-semibold">{format(day, "d")}</span>
                
                {/* Dots container for day's reservations */}
                <div className="flex gap-0.5 justify-center h-2 mt-1">
                  {dayReservations.map((res) => {
                    const dotClass =
                      res.status === "CANCELLED" ? "bg-slate-300" :
                      res.source === "naver" ? "bg-green-500" :
                      res.source === "spacecloud" ? "bg-indigo-500" : "bg-amber-500";
                    return (
                      <span
                        key={res.id}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isSelected ? "bg-white" : dotClass
                        )}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected Day Reservations List */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-50">
          <h3 className="text-sm font-bold text-slate-800">
            {format(selectedDate, "M월 d일")} 일정 ({selectedReservations.length}건)
          </h3>
          <span className="text-xs text-slate-400">선택한 날짜별 예약</span>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-6 text-slate-400 text-xs">예약 데이터를 불러오는 중...</div>
          ) : selectedReservations.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              이날 잡힌 예약이 없습니다. 우측 상단 &quot;+&quot; 버튼으로 수동 예약을 추가할 수 있습니다.
            </div>
          ) : (
            selectedReservations.map((res) => {
              const start = new Date(res.startTime);
              const end = new Date(res.endTime);
              const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
              const isCancelled = res.status === "CANCELLED";

              return (
                <div
                  key={res.id}
                  onDoubleClick={() => router.push(`/usage?selected=${res.id}`)}
                  title="더블클릭하면 이용현황에서 수정"
                  className={cn(
                    "p-4 rounded-xl border flex justify-between items-start gap-2 cursor-pointer select-none",
                    isCancelled ? "bg-slate-100 border-slate-200" : "bg-slate-50 border-slate-100 hover:border-indigo-200"
                  )}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isCancelled && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                          🚫 취소됨
                        </span>
                      )}
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", getSourceBadgeStyle(res.source))}>
                        {getSourceDisplay(res.source)}
                      </span>
                      {!res.emailId && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
                          ✍️수기
                        </span>
                      )}
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", getRoomBadgeStyle(res.roomName))}>
                        {res.roomName}
                      </span>
                      <strong className={cn("text-sm", isCancelled ? "text-slate-500 line-through" : "text-slate-900")}>{res.customerName}</strong>
                      {!isCancelled && res.paymentMethod && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {res.paymentMethod}
                        </span>
                      )}
                      {!isCancelled && !res.isPaid && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-600 border border-rose-200">
                          💸 미결제
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs text-slate-500">
                      <p className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatTime(start)} - {formatTime(end)} ({Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60))}시간)</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        <span>인원: {res.usageLog?.headCount || 1}명 ({res.usageLog?.purpose || UNCATEGORIZED_LABEL}{res.usageLog?.detail ? ` · ${res.usageLog.detail}` : ""})</span>
                      </p>
                      {res.price > 0 && (
                        <p className="flex items-center gap-1 text-slate-700">
                          <Wallet className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isCancelled ? "수수료" : "요금"}: <strong className="text-slate-800">{res.price.toLocaleString()}원</strong></span>
                        </p>
                      )}
                      {!isCancelled && res.discount > 0 && (
                        <p className="flex items-center gap-1 text-rose-600">
                          <span>🎟️ 쿠폰 사용: -{res.discount.toLocaleString()}원</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {!isCancelled && !res.isPaid && (
                      <button
                        onClick={() => handleMarkPaid(res.id)}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition active:scale-95 whitespace-nowrap"
                        title="결제완료로 변경"
                      >
                        결제완료 처리
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openCopyModal(res)}
                        className="p-2 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 transition active:scale-95"
                        title="이 예약 복사 (반복 예약 빠르게 추가)"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReservation(res.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition active:scale-95"
                        title="예약 및 로그 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
      </div>

      {/* Manual Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 flex justify-between items-center border-b border-slate-100 bg-slate-50">
              <h2 className="font-bold text-slate-800">새 수동 예약 추가</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">예약 루트</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium bg-white"
                  >
                    <option value="naver">네이버</option>
                    <option value="spacecloud">스페이스클라우드</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">공간 선택</label>
                  <select
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium bg-white"
                  >
                    <option value="머무룸1">머무룸1</option>
                    <option value="머무룸2">머무룸2</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">예약자 성함</label>
                  <input
                    type="text"
                    required
                    placeholder="김철수"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">전화번호 (선택)</label>
                  <input
                    type="tel"
                    placeholder="010-1234-5678"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">예약 일자</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">시작 시간</label>
                  <TimeSelect value={formStartTime} onChange={setFormStartTime} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">종료 시간</label>
                  <TimeSelect value={formEndTime} onChange={setFormEndTime} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">인원 수 (명)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formGuests}
                    onChange={(e) => setFormGuests(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">이용 목적 (대분류)</label>
                  <select
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium bg-white"
                  >
                    <option value="">미입력</option>
                    {MAJOR_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">세부내용 (선택 입력)</label>
                <input
                  type="text"
                  value={formDetail}
                  onChange={(e) => setFormDetail(e.target.value)}
                  placeholder="예: 보험교육, 유튜브 촬영"
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">결제 가격 (원화)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">결제 수단</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 outline-hidden focus:border-indigo-500 font-medium bg-white"
                  >
                    <option value="현장카드">현장카드</option>
                    <option value="계좌이체">계좌이체</option>
                  </select>
                </div>
              </div>

              {/* 결제 완료 여부 토글 */}
              <button
                type="button"
                onClick={() => setFormIsPaid(!formIsPaid)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition active:scale-[0.99] ${
                  formIsPaid
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-rose-50 border-rose-200"
                }`}
              >
                <span className="text-sm font-bold text-slate-700">결제 완료 여부</span>
                <span className={`flex items-center gap-1.5 text-sm font-bold ${formIsPaid ? "text-emerald-600" : "text-rose-600"}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${formIsPaid ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {formIsPaid ? "결제완료" : "미결제"}
                </span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 text-sm rounded-xl hover:shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? "예약 등록 중..." : "예약 생성 완료"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
