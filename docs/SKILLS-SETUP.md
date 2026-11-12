# Навыки Codex для ARGENTI

Навыки установлены в проектную директорию `.agents/skills/` стандартным помощником Codex `skill-installer`. Проверено наличие каждого `SKILL.md` и его ссылочных файлов. Они станут доступными Codex после перезапуска или открытия новой сессии в доверенном проекте; текущая сессия не доказывает их автоматическую активацию.

| Навык | Источник | Назначение | Состояние |
| --- | --- | --- | --- |
| `frontend-design` | [Anthropic Skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design), Apache-2.0 | Визуальное направление, типографика, композиция | Установлен |
| `web-design-guidelines` | [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) | Финальная проверка UX и доступности | Установлен |
| `composition-patterns` | [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns), MIT | Переиспользуемые React-компоненты | Установлен |
| `react-view-transitions` | [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-view-transitions), MIT | Переходы между представлениями | Установлен |
| `frontend-ui` | [SvaraNova Skills](https://github.com/SvaraNova/skills/tree/main/frontend/frontend-ui), MIT | Адаптивный UI и состояния | Установлен |
| `web-motion` | [SvaraNova Skills](https://github.com/SvaraNova/skills/tree/main/frontend/web-motion), MIT | Система анимаций | Установлен |
| `data-visualization` | [SvaraNova Skills](https://github.com/SvaraNova/skills/tree/main/frontend/data-visualization), MIT | Доступные и честные графики | Установлен |
| `motion` | [Motion AI Kit](https://github.com/motiondivision/ai-kit/tree/main/plugins/motion/skills/motion), MIT | Официальные практики Motion | Установлен |

Навык `vercel-react-best-practices` из Vercel Agent Skills не копировался повторно: в текущем Codex уже доступен навык `vercel:react-best-practices` с тем же назначением. [Motion Primitives](https://github.com/ibelick/motion-primitives) оценена как MIT-библиотека компонентов; отдельная установка сейчас не нужна, поскольку используемые переходы реализованы через официальный Motion без лишних зависимостей.

Резервный каталог `/run/media/yozek/Data/EndeavourOS-Backup-2026-11-04/03-Codex/` исследовался ранее в этой работе: найденные материалы были индексами и манифестами, не содержали доступных `SKILL.md` или `AGENTS.md`; архивы, на которые ссылался индекс, отсутствовали. На момент финальной проверки том снова недоступен (`No such file or directory`). Из резервной копии ничего не запускалось, не копировалось и не устанавливалось. Проектные навыки из таблицы выше установлены из указанных открытых источников; фактическое наличие восьми `SKILL.md` проверено в `.agents/skills/`.

В работе применялись рекомендации `frontend-design` и `frontend-ui` по композиции референсов, `web-motion` и `motion` по коротким переходам и `prefers-reduced-motion`, `data-visualization` по честным пустым графикам, `web-design-guidelines` по адаптивности и клавиатурной доступности. Рекомендации из `vercel:react-best-practices` использованы при проверке React-компонентов. Активность этих локальных навыков как автоматических команд Codex после перезапуска не проверена: документы прочитаны и применены вручную.

Бесплатный сервер Motion MCP прописан в `.codex/config.toml` (`https://mcp.motion.dev`). Платный сервер Motion+ не добавлен. `codex mcp list` в текущей сессии не показывает проектный сервер: до утверждения доверия к проекту и перезапуска Codex соединение считается **настроенным, но не подтверждённым как активное**. Проверка после перезапуска: `codex mcp list` и поиск инструмента Motion в списке инструментов Codex.

Интерактивный npm-установщик `motion-ai@14.2.0` был остановлен до подтверждения: опубликованный пакет предложил добавить `motion-plus` даже без флага `--plus`. Поэтому использован официальный репозиторий навыка и только бесплатный MCP-адрес.
