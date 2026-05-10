
export function HeaderLayout(props: React.ComponentProps<"h2">) {
  return (
    <section className="w-full mt-5">
      <h2 className="flex justify-start font-heading text-4xl font-semibold" {...props}>
        {props.children}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground border-b border-solid w-full">
      </p>
    </section>
  );
}
