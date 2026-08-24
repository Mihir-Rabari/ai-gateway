#!/bin/bash
# Remove Terminal from page.tsx
sed -i 's/Terminal, //g' apps/web/src/app/page.tsx

# Fix comments in page.tsx
sed -i 's/\/\/ One endpoint — any model/{"\/\/ One endpoint — any model"}/g' apps/web/src/app/page.tsx
sed -i 's/\/\/ ↳ Auto-routed to cheapest provider/{"\/\/ ↳ Auto-routed to cheapest provider"}/g' apps/web/src/app/page.tsx
sed -i 's/\/\/ via OpenAI/{"\/\/ via OpenAI"}/g' apps/web/src/app/page.tsx
sed -i 's/\/\/ 1 credit deducted/{"\/\/ 1 credit deducted"}/g' apps/web/src/app/page.tsx

# Fix quotes in terms/page.tsx
sed -i 's/"as is"/\&quot;as is\&quot;/g' apps/web/src/app/terms/page.tsx

# Fix unused err in CodexConnect.tsx
sed -i 's/catch (err) {/catch {/g' apps/web/src/components/CodexConnect.tsx

# Fix unused in layout.tsx
sed -i 's/import { Inter } from "next\/font\/google";//g' apps/web/src/app/layout.tsx

# Fix unused in dashboard/layout.tsx
sed -i 's/import { useEffect, useState } from "react";/import { useState } from "react";/g' apps/web/src/app/dashboard/layout.tsx
sed -i 's/import { api, type UserProfile } from "@\/lib\/api";/import { api } from "@\/lib\/api";/g' apps/web/src/app/dashboard/layout.tsx
