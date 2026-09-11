#!/bin/bash
sed -i 's/useEffect, //g' apps/web/src/app/dashboard/layout.tsx
sed -i 's/, type UserProfile//g' apps/web/src/app/dashboard/layout.tsx
sed -i 's/Inter, //g' apps/web/src/app/layout.tsx
sed -i 's/Terminal, //g' apps/web/src/app/page.tsx
sed -i 's/\/\/ Initialize/\/\/\/ Initialize/g' apps/web/src/app/page.tsx
sed -i 's/\/\/ Use the client/\/\/\/ Use the client/g' apps/web/src/app/page.tsx
sed -i 's/\/\/ Response:/\/\/\/ Response:/g' apps/web/src/app/page.tsx
sed -i 's/"as is"/\&quot;as is\&quot;/g' apps/web/src/app/terms/page.tsx
sed -i 's/catch (err) {/catch {/g' apps/web/src/components/CodexConnect.tsx
sed -i '1d' apps/web/src/app/dashboard/layout.tsx
sed -i '2i import { useState } from "react";' apps/web/src/app/dashboard/layout.tsx
