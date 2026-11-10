"use client";

/**
 * Shared field groups for Forest products, Conveyances and Equipment rows.
 *
 * The same row data is rendered twice in the record forms:
 *   1. In the product sections (`named` = true)  → these inputs are submitted.
 *   2. In the Appraisal section (`named` = false) → same rows, same state,
 *      so editing species / quantity / value there updates the row above.
 *
 * Only the `named` copy carries `name=` attributes, so each row is submitted
 * exactly once.
 */

export const PRODUCT_TYPES = ["Logs", "Flitches", "Lumber", "Rattan", "Other"] as const;

export const PRODUCT_CONDITIONS = [
  { value: "GOOD_CONDITION", label: "Good condition" },
  { value: "DETERIORATING", label: "Deteriorating" },
  { value: "DETERIORATED", label: "Deteriorated" },
] as const;

export const SERVICE_STATUSES = [
  { value: "SERVICEABLE", label: "Serviceable" },
  { value: "UNSERVICEABLE", label: "Unserviceable" },
] as const;

export type ForestRow = {
  k: number;
  type: string;
  species: string;
  qty: string;
  bdft: string;
  cum: string;
  condition: string;
  value: string;
};

export type ConvRow = {
  k: number;
  type: string;
  plateNo: string;
  status: string;
  qty: string;
  value: string;
};

export type EquipRow = {
  k: number;
  type: string;
  registered: string;
  status: string;
  qty: string;
  value: string;
};

export const emptyForestRow = (k: number): ForestRow => ({
  k,
  type: "",
  species: "",
  qty: "",
  bdft: "",
  cum: "",
  condition: "",
  value: "",
});

export const emptyConvRow = (k: number): ConvRow => ({
  k,
  type: "",
  plateNo: "",
  status: "",
  qty: "1",
  value: "",
});

export const emptyEquipRow = (k: number): EquipRow => ({
  k,
  type: "",
  registered: "",
  status: "",
  qty: "1",
  value: "",
});

type Styles = { inputCls: string; selectCls: string; labelCls: string };

function Cell({
  label,
  labelCls,
  children,
}: {
  label: string;
  labelCls: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function ForestRowFields({
  row,
  onChange,
  named,
  styles,
}: {
  row: ForestRow;
  onChange: (patch: Partial<ForestRow>) => void;
  named: boolean;
  styles: Styles;
}) {
  const { inputCls, selectCls, labelCls } = styles;
  const n = (name: string) => (named ? name : undefined);
  const typeIsCustom = !!row.type && !(PRODUCT_TYPES as readonly string[]).includes(row.type);
  return (
    <>
      <Cell label="Type" labelCls={labelCls}>
        <select
          name={n("itemType")}
          value={row.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className={selectCls}
        >
          <option value="">— Type —</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {typeIsCustom && <option value={row.type}>{row.type}</option>}
        </select>
      </Cell>
      <Cell label="Species" labelCls={labelCls}>
        <input
          type="text"
          name={n("itemSpecies")}
          value={row.species}
          onChange={(e) => onChange({ species: e.target.value })}
          placeholder="e.g. Narra, Molave, Apitong"
          className={inputCls}
        />
      </Cell>
      <Cell label="Number of pieces" labelCls={labelCls}>
        <input
          type="text"
          name={n("itemQty")}
          value={row.qty}
          onChange={(e) => onChange({ qty: e.target.value })}
          placeholder="e.g. 12"
          className={inputCls}
        />
      </Cell>
      <Cell label="Volume (bd. ft.)" labelCls={labelCls}>
        <input
          type="number"
          step="any"
          name={n("itemVolumeBdFt")}
          value={row.bdft}
          onChange={(e) => onChange({ bdft: e.target.value })}
          placeholder="Board feet"
          className={inputCls}
        />
      </Cell>
      <Cell label="Volume (cu. m.)" labelCls={labelCls}>
        <input
          type="number"
          step="any"
          name={n("itemVolumeCuM")}
          value={row.cum}
          onChange={(e) => onChange({ cum: e.target.value })}
          placeholder="Cubic meters"
          className={inputCls}
        />
      </Cell>
      <Cell label="Status" labelCls={labelCls}>
        <select
          name={n("itemCondition")}
          value={row.condition}
          onChange={(e) => onChange({ condition: e.target.value })}
          className={selectCls}
        >
          <option value="">— Status —</option>
          {PRODUCT_CONDITIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Cell>
      <Cell label="Estimated value (₱)" labelCls={labelCls}>
        <input
          type="number"
          step="0.01"
          min={0}
          name={n("itemValue")}
          value={row.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="0.00"
          className={inputCls}
        />
      </Cell>
    </>
  );
}

export function ConvRowFields({
  row,
  onChange,
  named,
  styles,
}: {
  row: ConvRow;
  onChange: (patch: Partial<ConvRow>) => void;
  named: boolean;
  styles: Styles;
}) {
  const { inputCls, selectCls, labelCls } = styles;
  const n = (name: string) => (named ? name : undefined);
  return (
    <>
      <Cell label="Type" labelCls={labelCls}>
        <input
          type="text"
          name={n("convType")}
          value={row.type}
          onChange={(e) => onChange({ type: e.target.value })}
          placeholder="e.g. Motorcycle, kulong-kulong"
          className={inputCls}
        />
      </Cell>
      <Cell label="Plate no. *" labelCls={labelCls}>
        <input
          type="text"
          name={n("convPlateNo")}
          value={row.plateNo}
          onChange={(e) => onChange({ plateNo: e.target.value })}
          placeholder="Plate number"
          className={inputCls}
        />
      </Cell>
      <Cell label="Status" labelCls={labelCls}>
        <select
          name={n("convStatus")}
          value={row.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className={selectCls}
        >
          <option value="">— Status —</option>
          {SERVICE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Cell>
      <Cell label="Quantity" labelCls={labelCls}>
        <input
          type="number"
          min={1}
          step={1}
          name={n("convQty")}
          value={row.qty}
          onChange={(e) => onChange({ qty: e.target.value })}
          className={inputCls}
        />
      </Cell>
      <Cell label="Estimated value (₱)" labelCls={labelCls}>
        <input
          type="number"
          step="0.01"
          min={0}
          name={n("convValue")}
          value={row.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="0.00"
          className={inputCls}
        />
      </Cell>
    </>
  );
}

export function EquipRowFields({
  row,
  onChange,
  named,
  styles,
}: {
  row: EquipRow;
  onChange: (patch: Partial<EquipRow>) => void;
  named: boolean;
  styles: Styles;
}) {
  const { inputCls, selectCls, labelCls } = styles;
  const n = (name: string) => (named ? name : undefined);
  return (
    <>
      <Cell label="Type" labelCls={labelCls}>
        <input
          type="text"
          name={n("equipType")}
          value={row.type}
          onChange={(e) => onChange({ type: e.target.value })}
          placeholder="e.g. Chainsaw"
          className={inputCls}
        />
      </Cell>
      <Cell label="Registered *" labelCls={labelCls}>
        <select
          name={n("equipRegistered")}
          value={row.registered}
          onChange={(e) => onChange({ registered: e.target.value })}
          className={selectCls}
        >
          <option value="">— Select —</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </Cell>
      <Cell label="Status" labelCls={labelCls}>
        <select
          name={n("equipStatus")}
          value={row.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className={selectCls}
        >
          <option value="">— Status —</option>
          {SERVICE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Cell>
      <Cell label="Quantity" labelCls={labelCls}>
        <input
          type="number"
          min={1}
          step={1}
          name={n("equipQty")}
          value={row.qty}
          onChange={(e) => onChange({ qty: e.target.value })}
          className={inputCls}
        />
      </Cell>
      <Cell label="Estimated value (₱)" labelCls={labelCls}>
        <input
          type="number"
          step="0.01"
          min={0}
          name={n("equipValue")}
          value={row.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="0.00"
          className={inputCls}
        />
      </Cell>
    </>
  );
}
