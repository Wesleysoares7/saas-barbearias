function UpdateButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" className="bg-amber-400 text-zinc-950 hover:bg-amber-300" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}极n    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" variant="outline" className="border-zinc-600 text-zinc-100" disabled={pending}>
      {pending ? "Excluindo..." : <Trash2 className="size-4" />}
    </Button>
  );
}