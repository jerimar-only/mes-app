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
  revalidatePath("/reports");
}

export async function createRecord(formData: FormData) {
  const session = await getSession();
  if (!session || !permissions.createRecord(session.role as Role)) {
    throw new Error("You don't have permission to create records.");
  }

  const cenroOfficeId = parseInt(formData.get("cenroOfficeId") as string, 10);
  const year = parseInt(formData.get("year") as string, 10);
  const month = formData.get("month") ? parseInt(formData.get("month") as string, 10) : null;
  const dateOfApprehension = (formData.get("dateOfApprehension") as string) || null;
  const placeOfApprehension = (formData.get("placeOfApprehension") as string) || null;
  const circumstances = (formData.get("circumstances") as string) || null;
  const apprehendingAgency = (formData.get("apprehendingAgency") as string) || null;
  const claimantRespondent = (formData.get("claimantRespondent") as string) || null;
  const custodianLocation = (formData.get("custodianLocation") as string) || null;
  const otherAgencies = (formData.get("otherAgencies") as string) || null;
  const remarks = (formData.get("remarks") as string) || null;

  const itemQty = formData.getAll("itemQty") as string[];
  const itemSpecies = formData.getAll("itemSpecies") as string[];
  const itemForms = formData.getAll("itemForms") as string[];
  const itemVolumeBdFt = formData.getAll("itemVolumeBdFt") as string[];
  const itemVolumeCuM = formData.getAll("itemVolumeCuM") as string[];
  const itemValue = formData.getAll("itemValue") as string[];

  const items = itemSpecies
    .map((species, i) => ({
      quantity: itemQty[i] || null,
      species: species || null,
      forms: itemForms[i] || null,
      volumeBdFt: itemVolumeBdFt[i] ? parseFloat(itemVolumeBdFt[i]) : null,
      volumeCuM: itemVolumeCuM[i] ? parseFloat(itemVolumeCuM[i]) : null,
      estimatedValue: itemValue[i] ? parseFloat(itemValue[i]) : null,
    }))
    .filter((item) => item.species || item.forms || item.volumeBdFt || item.volumeCuM || item.estimatedValue);

  const convType = formData.getAll("convType") as string[];
  const convQty = formData.getAll("convQty") as string[];
  const conveyances = convType
    .map((type, i) => ({ type: type || null, quantity: parseInt(convQty[i] || "1", 10) || 1 }))
    .filter((c) => c.type);

  const equipType = formData.getAll("equipType") as string[];
  const equipQty = formData.getAll("equipQty") as string[];
  const equipment = equipType
    .map((type, i) => ({ type: type || null, quantity: parseInt(equipQty[i] || "1", 10) || 1 }))
    .filter((e) => e.type);

  const record = await prisma.apprehensionRecord.create({
    data: {
      cenroOfficeId,
      year,
      month,
      dateOfApprehension,
      placeOfApprehension,
      circumstances,
      apprehendingAgency,
      claimantRespondent,
      custodianLocation,
      otherAgencies,
      remarks,
      status: "UNKNOWN",
      items: items.length ? { create: items } : undefined,
      conveyances: conveyances.length ? { create: conveyances } : undefined,
      equipment: equipment.length ? { create: equipment } : undefined,
    },
  });

  revalidatePath("/records");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`/records/${record.id}`);
}
