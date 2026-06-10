import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { customerName, startTime, endTime, price, headCount, reservedHeadCount, coffeeCount, purpose, detail } = body;

    // First check if reservation exists
    const existing = await prisma.reservation.findUnique({
      where: { id },
      include: { usageLog: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // Prepare update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (customerName !== undefined) updateData.customerName = customerName;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (price !== undefined) updateData.price = Number(price);

    // Prepare usage data update
    if (headCount !== undefined || reservedHeadCount !== undefined || coffeeCount !== undefined || purpose !== undefined || detail !== undefined) {
      if (existing.usageLog) {
        updateData.usageLog = {
          update: {
            headCount: headCount !== undefined ? Number(headCount) : undefined,
            reservedHeadCount: reservedHeadCount !== undefined ? Number(reservedHeadCount) : undefined,
            coffeeCount: coffeeCount !== undefined ? Number(coffeeCount) : undefined,
            purpose: purpose !== undefined ? purpose : undefined,
            detail: detail !== undefined ? detail : undefined,
          },
        };
      } else {
        updateData.usageLog = {
          create: {
            headCount: headCount !== undefined ? Number(headCount) : 1,
            reservedHeadCount: reservedHeadCount !== undefined ? Number(reservedHeadCount) : (headCount !== undefined ? Number(headCount) : 1),
            coffeeCount: coffeeCount !== undefined ? Number(coffeeCount) : 0,
            purpose: purpose !== undefined ? purpose : null,
            detail: detail !== undefined ? detail : null,
          },
        };
      }
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: {
        usageLog: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH reservation error:", error);
    return NextResponse.json({ error: "Failed to update reservation" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Delete associated details first. We can do this with transact or clean up
    await prisma.usageLog.deleteMany({
      where: { reservationId: id },
    });

    const deleted = await prisma.reservation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("DELETE reservation error:", error);
    return NextResponse.json({ error: "Failed to delete reservation" }, { status: 500 });
  }
}
