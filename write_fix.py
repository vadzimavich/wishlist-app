import os

old_file = r'C:\Users\Admin\Desktop\wishlist-app\frontend\src\components\invite\InviteGuests.tsx'

with open(old_file, 'r') as f:
    content = f.read()

# Fix 1: Replace distanceMin from 30 to 65
content = content.replace('distanceMin: 30', 'distanceMin: 65')

# Fix 2: Replace the center guest positioning - remove transform, use offset
old_center = '''                <motion.div key={centerGuest.id} variants={nodeVariants}
                  className="absolute pointer-events-none"
                  style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', zIndex: 10 }}>'''
new_center = '''                <motion.div key={centerGuest.id} variants={nodeVariants}
                  className="absolute pointer-events-none"
                  style={{ left: pos.x - 35, top: pos.y - 35, zIndex: 10 }}>'''
content = content.replace(old_center, new_center)

# Fix 3: Replace orbiting guests positioning - remove transform, use offset
old_orbit = '''                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)', touchAction: 'none' }}'''
new_orbit = '''                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{ left: pos.x - 27, top: pos.y - 27, touchAction: 'none' }}'''
content = content.replace(old_orbit, new_orbit)

# Fix 4: Add resize guard to prevent continuous recalculations
old_resize = '''    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()'''
new_resize = '''    measure()
    const prevSize = { w: 0, h: 0 }
    const ro = new ResizeObserver(() => {
      const nw = el.offsetWidth || 800
      if (nw !== prevSize.w || 420 !== prevSize.h) {
        prevSize.w = nw; prevSize.h = 420
        measure()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()'''
content = content.replace(old_resize, new_resize)

with open(old_file, 'w', newline='') as f:
    f.write(content)

print(f'Updated {len(content)} chars')
