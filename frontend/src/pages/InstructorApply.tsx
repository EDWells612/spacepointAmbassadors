import { useEffect, useState } from "react"
import logo from "@/assets/logo.svg"
import { useParams } from "@tanstack/react-router"
import { CheckCircle2 } from "lucide-react"
import { applyInstructorApi, validateInviteApi } from "@/api/auth"
import { Button } from "@/components/ui/button"

export default function InstructorApply() {
  const { code } = useParams({ strict: false }) as { code?: string }
  const [ambassador, setAmbassador] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: "", email: "", invite_code: code ?? "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const codeToValidate = form.invite_code || code
    if (codeToValidate) {
      validateInviteApi(codeToValidate)
        .then((r) => setAmbassador(r.ambassador_name))
        .catch(() => setAmbassador(null))
    }
  }, [form.invite_code, code])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await applyInstructorApi({ full_name: form.full_name, email: form.email, invite_code: form.invite_code })
      setDone(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 justify-center">
          <img src={logo} alt="SpacePoint" className="h-10 w-auto object-contain" />
        </div>
        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><CheckCircle2 size={28} /></div>
            <h1 className="text-2xl font-bold text-black mb-2">Application received</h1>
            <p className="text-sm text-gray-500">An administrator will review your instructor application.</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-black mb-1 tracking-tight">Join as an instructor</h1>
            <p className="text-sm text-gray-500 mb-8">
              {ambassador ? `Invited by ${ambassador}.` : "Enter the invite code from your ambassador."}
            </p>
            <form onSubmit={submit} className="flex flex-col gap-4">
              <input className="input" placeholder="Full name" value={form.full_name} onChange={set("full_name")} required />
              <input className="input" type="email" placeholder="Email" value={form.email} onChange={set("email")} required />
              <input className="input" placeholder="Invite code" value={form.invite_code} onChange={set("invite_code")} />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" disabled={loading || !ambassador} className="mt-2">
                {loading ? "Submitting…" : "Submit application"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
