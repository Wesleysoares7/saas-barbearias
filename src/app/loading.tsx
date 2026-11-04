import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950"
    >
      <Spinner className="size-8 text-amber-400" />
      <p className="text-sm text-zinc-300">Carregando...</p>
    </main>
  );
}
