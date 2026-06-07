import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SEED_DATA = [
  {
    source: "naver",
    customerName: "김철수",
    startTime: "2026-06-15T14:00:00",
    endTime: "2026-06-15T17:00:00",
    price: 45000,
    headCount: 4,
    coffeeCount: 4,
    purpose: "회의"
  },
  {
    source: "spacecloud",
    customerName: "이영희",
    startTime: "2026-06-18T18:00:00",
    endTime: "2026-06-18T22:00:00",
    price: 80000,
    headCount: 6,
    coffeeCount: 0,
    purpose: "파티"
  },
  {
    source: "naver",
    customerName: "박지훈",
    startTime: "2026-06-12T10:00:00",
    endTime: "2026-06-12T12:00:00",
    price: 20000,
    headCount: 2,
    coffeeCount: 2,
    purpose: "스터디"
  },
  {
    source: "spacecloud",
    customerName: "최수진",
    startTime: "2026-06-05T13:00:00",
    endTime: "2026-06-05T16:00:00",
    price: 60000,
    headCount: 3,
    coffeeCount: 1,
    purpose: "촬영"
  },
  {
    source: "naver",
    customerName: "정민우",
    startTime: "2026-06-25T15:00:00",
    endTime: "2026-06-25T19:00:00",
    price: 120000,
    headCount: 8,
    coffeeCount: 8,
    purpose: "세미나"
  },
  {
    source: "manual",
    customerName: "임서연",
    startTime: "2026-06-03T16:00:00",
    endTime: "2026-06-03T18:00:00",
    price: 50000,
    headCount: 5,
    coffeeCount: 3,
    purpose: "회의"
  }
];

export async function GET() {
  try {
    const count = await prisma.reservation.count();
    
    if (count === 0) {
      console.log("Auto-seeding initial reservation database...");
      for (const item of SEED_DATA) {
        await prisma.reservation.create({
          data: {
            source: item.source,
            customerName: item.customerName,
            startTime: new Date(item.startTime),
            endTime: new Date(item.endTime),
            price: item.price,
            usageLog: {
              create: {
                headCount: item.headCount,
                coffeeCount: item.coffeeCount,
                purpose: item.purpose
              }
            }
          }
        });
      }
    }

    const reservations = await prisma.reservation.findMany({
      include: {
        usageLog: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });
    return NextResponse.json(reservations);
  } catch (error) {
    console.error("GET reservations error:", error);
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, customerName, startTime, endTime, price, headCount, coffeeCount, purpose } = body;

    const reservation = await prisma.reservation.create({
      data: {
        source: source || "manual",
        customerName: customerName || "미지정",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        price: Number(price) || 0,
        usageLog: {
          create: {
            headCount: Number(headCount) || 1,
            coffeeCount: Number(coffeeCount) || 0,
            purpose: purpose || "기타",
          },
        },
      },
      include: {
        usageLog: true,
      },
    });

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("POST reservation error:", error);
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }
}
