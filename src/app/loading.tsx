export default function AppLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-3 w-3 rounded-full bg-primary animate-bounce" />
        <div className="h-3 w-3 rounded-full bg-primary/80 animate-bounce [animation-delay:100ms]" />
        <div className="h-3 w-3 rounded-full bg-primary/60 animate-bounce [animation-delay:200ms]" />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
}

