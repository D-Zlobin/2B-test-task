import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section>
      <p className="eyebrow">Ошибка 404</p>
      <h1>Страница не найдена</h1>
      <Link to="/objects" className="button primary">Перейти к объектам</Link>
    </section>
  )
}
