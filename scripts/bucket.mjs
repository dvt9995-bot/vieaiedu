import { createClient } from "@supabase/supabase-js";
const c = createClient("https://fnsiireeemapgmomtlou.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuc2lpcmVlZW1hcGdtb210bG91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg3MDczNywiZXhwIjoyMDk3NDQ2NzM3fQ.TVE9Z6sHgvr3_hKc1Lkbx3PPrPL_umJxJ0KYDM8wYT4");
const { error } = await c.storage.createBucket("community",{public:true,fileSizeLimit:"5MB"});
console.log(error ? ("bucket: "+error.message) : "bucket 'community' created (public)");
