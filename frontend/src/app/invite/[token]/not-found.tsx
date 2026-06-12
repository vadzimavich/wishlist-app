export default function InviteNotFound() {
  return (
    <div className="min-h-screen bg-brand-midnight flex items-center justify-center px-4">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="orb orb-purple w-80 h-80 -top-20 -left-20 opacity-10" />
        <div className="orb orb-violet w-60 h-60 bottom-20 right-10 opacity-8" />
      </div>

      <div className="relative z-10 text-center">
        <p className="text-7xl mb-6">💌</p>
        <h1 className="font-display font-bold text-3xl text-brand-pearl mb-3">
          Приглашение не найдено
        </h1>
        <p className="text-brand-pearl/50 text-base max-w-xs mx-auto">
          Эта ссылка недействительна или мероприятие уже прошло.
          Попроси организатора прислать новую ссылку.
        </p>
      </div>
    </div>
  )
}
