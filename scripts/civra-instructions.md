MANDATORY DESIGN SYSTEM - Apply these Sleek Web3 UI principles:

1. Typography & Fonts:
   - Use system font stack only: font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif
   - NO external fonts (no Google Fonts, no custom fonts)
   - Headings: bold and large (text-3xl to text-5xl, font-bold, leading-tight)
   - Body text: text-base to text-lg with relaxed line height (leading-relaxed)

2. Color Scheme & Background:
   - Dark background with subtle teal gradient: bg-gradient-to-br from-gray-900 via-gray-900 to-teal-900
   - Add faint grid overlay using CSS: background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0); background-size: 20px 20px
   - Primary accent color: teal-400 (#2dd4bf)
   - High contrast text: white for headings, gray-200 for body
   - Clear visual hierarchy with proper contrast ratios

3. Layout & Spacing:
   - Container max-width: 1200px (max-w-6xl)
   - Center all content horizontally
   - Generous whitespace with proper padding and margins
   - Use gap-8 to gap-16 for section spacing

4. Components & Cards:
   - All cards: rounded-xl to rounded-2xl (12-16px border radius)
   - Translucent borders: border border-gray-800 or border-white/10
   - Soft shadows: shadow-xl
   - Background: bg-gray-800/30 or bg-black/20

5. Buttons:
   - Primary buttons: pill-shaped (rounded-full), 44px tall (h-11), solid teal background (bg-teal-400), black text (text-black)
   - Secondary buttons: ghost style with teal border (border border-teal-400 text-teal-400 bg-transparent), same dimensions
   - Hover states with 150-200ms transitions: hover:bg-teal-500, hover:scale-105

6. Animations & Transitions:
   - Minimal motion: only 150-200ms transitions for hover/focus states
   - Use transition-all duration-200 ease-in-out
   - Subtle hover effects: scale-105 or brightness adjustments
   - NO complex animations, keep it clean and professional

7. Code Quality & Tailwind CSS:
   - Use semantic, accessible HTML elements
   - Proper heading hierarchy (h1, h2, h3)
   - Alt text for all images
   - NO heavy libraries beyond NextJS and Tailwind
   - Clean, minimal code structure
   - IMPORTANT: Only use STANDARD Tailwind CSS classes - no custom classes like 'border-border', 'text-foreground', 'bg-background'
   - Use standard colors: gray-50, gray-100, gray-200...gray-900, black, white, teal-400, etc.
   - Avoid shadcn/ui or custom CSS variables - stick to default Tailwind classes only

8. Overall Aesthetic:
   - Clean, modern, and professional appearance
   - Web3 SaaS landing page feel, NOT generic template
   - Consistent spacing and alignment
   - Professional color palette with teal accents
   - High-quality, polished finish

These design principles are MANDATORY and must be applied to every page and component. The result should look like a premium Web3 application, not a basic template.