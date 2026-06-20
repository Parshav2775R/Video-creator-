/**
 * Firebase Firestore REST API client
 * Used instead of firebase-admin since we have a web API key, not a service account.
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!;
const API_KEY = process.env.FIREBASE_API_KEY!;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

type FirestoreDoc = {
  name: string;
  fields: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

function toValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toValue) } };
  }
  if (typeof val === "object") {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      fields[k] = toValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromValue(val: FirestoreValue): unknown {
  if ("nullValue" in val) return null;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return val.doubleValue;
  if ("stringValue" in val) return val.stringValue;
  if ("arrayValue" in val) {
    return (val.arrayValue.values ?? []).map(fromValue);
  }
  if ("mapValue" in val) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields ?? {})) {
      obj[k] = fromValue(v);
    }
    return obj;
  }
  return null;
}

function docToObject(doc: FirestoreDoc): Record<string, unknown> {
  const id = doc.name.split("/").pop()!;
  const obj: Record<string, unknown> = { id };
  for (const [k, v] of Object.entries(doc.fields ?? {})) {
    obj[k] = fromValue(v);
  }
  return obj;
}

async function firestoreRequest(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = `${BASE_URL}${path}?key=${API_KEY}`;
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore ${method} ${path} failed: ${res.status} ${text}`);
  }

  if (method === "DELETE") return null;
  return res.json();
}

export async function listDocuments(collection: string): Promise<Record<string, unknown>[]> {
  const data = (await firestoreRequest("GET", `/${collection}`)) as {
    documents?: FirestoreDoc[];
  };
  return (data.documents ?? []).map(docToObject);
}

export async function getDocument(collection: string, id: string): Promise<Record<string, unknown> | null> {
  try {
    const doc = (await firestoreRequest("GET", `/${collection}/${id}`)) as FirestoreDoc;
    return docToObject(doc);
  } catch (e) {
    if (e instanceof Error && e.message.includes("404")) return null;
    throw e;
  }
}

export async function createDocument(
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toValue(v);
  }
  const doc = (await firestoreRequest(
    "PATCH",
    `/${collection}/${id}`,
    { fields },
  )) as FirestoreDoc;
  return docToObject(doc);
}

export async function updateDocument(
  collection: string,
  id: string,
  data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    fields[k] = toValue(v);
  }
  // Build field mask for partial update
  const fieldPaths = Object.keys(data).join(",");
  const url = `${BASE_URL}/${collection}/${id}?key=${API_KEY}&updateMask.fieldPaths=${fieldPaths.split(",").join("&updateMask.fieldPaths=")}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore PATCH failed: ${res.status} ${text}`);
  }
  const doc = (await res.json()) as FirestoreDoc;
  return docToObject(doc);
}

export async function deleteDocument(collection: string, id: string): Promise<void> {
  await firestoreRequest("DELETE", `/${collection}/${id}`);
}
