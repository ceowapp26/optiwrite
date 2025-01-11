function MyComponent() {
  const usage = useUsageStore();

  useEffect(() => {
    usage.refreshUsage();
    const interval = setInterval(usage.refreshUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <UsageLimitBanner 
        aiApi={usage.aiApi}
        crawlApi={usage.crawlApi}
      />
      {/* Rest of your component */}
    </div>
  );
}