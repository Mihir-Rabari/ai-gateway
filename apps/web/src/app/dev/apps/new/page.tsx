"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function RegisterAppPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [desc, setDesc] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "App Registered",
        description: `Successfully created ${name}`,
      });
      router.push("/dev/apps/app_new123");
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 mt-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Register New App</h1>
        <p className="text-white/60">Create a new application to get an API key and integrate AI Gateway.</p>
      </div>

      <Card className="bg-[#0a0a0a] border-white/10">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Application Details</CardTitle>
            <CardDescription className="text-white/40">These details help us track your integrations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none text-white/80">App Name <span className="text-red-400">*</span></label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome App"
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium leading-none text-white/80">Website URL</label>
              <Input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://myawesomeapp.com"
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="desc" className="text-sm font-medium leading-none text-white/80">Description</label>
              <Input
                id="desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Briefly describe what your app does"
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
              />
            </div>

            <div className="pt-4 flex gap-4 border-t border-white/5">
              <Button type="submit" disabled={loading} className="bg-white text-black hover:bg-white/90">
                {loading ? "Registering..." : "Register App"}
              </Button>
              <Link href="/dev/apps">
                <Button type="button" variant="outline" className="border-white/20 text-white hover:bg-white/5">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
