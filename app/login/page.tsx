import { login } from "./actions";

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 320, margin: "80px auto" }}>
      <h1>Log in</h1>
      <form action={login}>
        <div>
          <label>Username</label>
          <br />
          <input type="text" name="email" required />
        </div>
        <div style={{ marginTop: 8 }}>
          <label>Password</label>
          <br />
          <input type="password" name="password" required />
        </div>
        <button type="submit" style={{ marginTop: 12 }}>Log in</button>
      </form>
    </div>
  );
}
