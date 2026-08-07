import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Сессия не найдена — выйдите и войдите снова" },
      { status: 401 },
    );
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const row = {
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth,
    user_id: user.id,
  };

  // Prefer update-then-insert to avoid RLS quirks on upsert.
  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", body.endpoint)
    .maybeSingle();

  let error;
  if (existing?.id) {
    ({ error } = await supabase
      .from("push_subscriptions")
      .update(row)
      .eq("id", existing.id));
  } else {
    ({ error } = await supabase.from("push_subscriptions").insert(row));
  }

  if (error) {
    // Common when SQL migration wasn't applied
    const hint =
      error.message.includes("does not exist") || error.code === "42P01"
        ? " — выполните supabase/apply_notifications.sql в Supabase"
        : "";
    return NextResponse.json(
      { error: `${error.message}${hint}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
