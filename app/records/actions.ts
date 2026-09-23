"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { permissions, type Role } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateRecordStatus(formData: FormData) {
  const session = await getSession();
  if (!session || !permissions.editSavedRecord(session.role as Role)) {
    throw new Error("You don't have permission to edit saved records.");
  }

  const id = parseInt(formData.get("id") as string, 10);
  const status = formData.get("status") as any;
  const docketNumber = (formData.get("docketNumber") as string) || null;
  const orderOfFinalityDate = (formData.get("orderOfFinalityDate") as string) || null;

  await prisma.apprehensionRecord.update({
    where: { id },
    data: { status, docketNumber, orderOfFinalityDate },
  });

  revalidatePath(`/records/${id}`);
  revalidatePath("/records");
  revalidatePath("/dashboard");
}

export async function createRecord(formData: FormData) {
  const session = await getSession();
  if (!session || !permissions.createRecord(session.role as Role)) {
    throw new Error("You don't have permission to create records.");
  }

  const cenroOfficeId = parseInt(formData.get("cenroOfficeId") as string, 10);
  const year = parseInt(formData.get("year") as string, 10);
  const dateOfApprehension = (formData.get("dateOfApprehension") as string) || null;
  const placeOfApprehension = (formData.get("placeOfApprehension") as string) || null;
  const circumstances = (formData.get("circumstances") as string) || null;
  const custodianLocation = (formData.get("custodianLocation") as string) || null;
  const otherAgencies = (formData.get("otherAgencies") as string) || null;
  const remarks = (formData.get("remarks") as string) || null;

  const descriptions = formData.getAll("itemDescription") as string[];
  const volumes = formData.getAll("itemVolume") as string[];
  const values = formData.getAll("itemValue") as string[];

  const items = descriptions
    .map((description, i) => ({
      description: description || null,
      volumeCuM: volumes[i] ? parseFloat(volumes[i]) : null,
      estimatedValue: values[i] ? parseFloat(values[i]) : null,
    }))
    .filter((item) => item.description || item.volumeCuM || item.estimatedValue);

  const record = await prisma.apprehensionRecord.create({
    data: {
      cenroOfficeId,
      year,
      dateOfApprehension,
      placeOfApprehension,
      circumstances,
      custodianLocation,
      otherAgencies,
      remarks,
      status: "UNKNOWN",
      items: { create: items },
    },
  });

  revalidatePath("/records");
  revalidatePath("/dashboard");
  redirect(`/records/${record.id}`);
}
