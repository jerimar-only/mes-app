import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createUser } from "./actions";

export default async function UsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMINISTRATOR") {
    redirect("/dashboard");
  }

  return (
    <div>
      <h1>Create user account</h1>
      <form action={createUser}>
        <div>
          <label>Full name</label>
          <br />
          <input type="text" name="fullName" required />
        </div>
        <div>
          <label>Username</label>
          <br />
          <input type="text" name="email" required />
        </div>
        <div>
          <label>Password</label>
          <br />
          <input type="password" name="password" required />
        </div>
        <div>
          <label>Role</label>
          <br />
          <select name="role" required>
            <option value="ENCODER">Encoder</option>
            <option value="ADMINISTRATOR">Administrator</option>
          </select>
        </div>
        <br />
        <button type="submit">Create account</button>
      </form>
    </div>
  );
}
