# QuizMeister
Currently WIP state, soon will be published on my website.

<<<<<<< Updated upstream
(C) 2026 Szafruga Software.
=======
Quiz na żywo w stylu Kahoot. Host (nauczyciel) tworzy quiz i uruchamia grę, gracze dołączają z telefonów przez 6-cyfrowy PIN i nick, odpowiadają na czas, a po każdym pytaniu widzą ranking.

(C) 2026 Szafruga Software.

## Uruchomienie

Wymagania: Node.js >= 22.18.

```bash
npm install
npm run dev
```

- klient (Vite + React Router): http://localhost:5173
- serwer (Express + Socket.IO): http://localhost:8080, klient proxuje do niego `/api` i `/socket.io`

### Docker

```bash
docker compose up --build
```

Aplikacja jest dostępna pod http://localhost:8080 (zmiana portu: `WEB_PORT=3000 docker compose up --build`). Kontener `client` to nginx z zbudowanym SPA, który proxuje `/api` i `/socket.io` do kontenera `server`. Baza SQLite leży w wolumenie `quiz-data`, więc przeżywa restarty (`docker compose down -v` ją usuwa). Za HTTPS ustaw `COOKIE_SECURE=true`.

Inne skrypty: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test --prefix server`.

Zmienne środowiskowe (lista w `server/.env.example`, serwer nie wczytuje pliku sam, więc ustaw je w środowisku albo uruchom z `node --env-file=.env`): `PORT` (domyślnie 8080) `DB_PATH` (domyślnie `./data/quiz.db`, plik i migracje tworzą się automatycznie), `TRUST_PROXY` (`true` za reverse proxy, żeby limity liczyły prawdziwe IP klientów) i `COOKIE_SECURE` (ciasteczko sesji tylko po HTTPS, domyślnie włączone przy `NODE_ENV=production`).

## Architektura

| Warstwa | Odpowiedzialność |
| --- | --- |
| `client/` | React + React Router. Panel admina (quizy, historia), ekran hosta (`/host/:quizId`), ekran gracza (`/lobby`). Klient tylko wyświetla to, co wyśle serwer. |
| `server/routes`, `server/repo` | REST API (`/api/v1`): auth, quizy, pytania, historia gier. Walidacja po stronie serwera, SQLite przez better-sqlite3. |
| `server/ws/game.ts` | Cała logika gry: fazy, timer, punktacja, blokada podwójnej odpowiedzi, odrzucanie spóźnionych odpowiedzi, statystyki. Nie zależy od Socket.IO (przyjmuje interfejs `Emitter`), dlatego jest testowana bez serwera. |
| `server/ws/index.ts` | Cienka warstwa Socket.IO: autoryzacja, rooms, mapowanie zdarzeń na funkcje z `game.ts`, zapis wyniku do bazy po zakończeniu gry. |
| `server/lib/db.ts` | Połączenie z SQLite i migracje (`user_version`). |

Serwer jest jedynym źródłem prawdy: timer, punkty i poprawna odpowiedź istnieją tylko na serwerze. Gracz dostaje poprawną odpowiedź dopiero w `question:end`, a czas odpowiedzi mierzy serwer (wartości od klienta są ignorowane). Każda gra ma własne pokoje Socket.IO (`<PIN>`, `host:<PIN>`, `players:<PIN>`).

Po zakończeniu gry pełne statystyki zapisują się w tabeli `game_results` i są dostępne w panelu admina w zakładce History (`GET /api/v1/history`, `GET /api/v1/history/:id`, `DELETE /api/v1/history/:id`).

## Kontrakt zdarzeń Socket.IO

Zmiany względem propozycji z polecenia projektu:

| Zdarzenie | Kierunek | Opis |
| --- | --- | --- |
| `host:create` | host → serwer | Tworzy grę z quizu, odpowiedź zawiera PIN |
| `host:rejoin` | host → serwer | Powrót hosta do własnej gry (rozpoznanie po sesji logowania), odpowiedź zawiera migawkę stanu bieżącej fazy |
| `host:start` | host → serwer | Start gry z lobby (zamiast pierwszego `host:next`) |
| `host:next` | host → serwer | Przejście dalej z ekranu wyników pytania |
| `player:join` | gracz → serwer | PIN i nick, odpowiedź zawiera token |
| `player:rejoin` | gracz → serwer | Powrót na podstawie tokenu z `sessionStorage` |
| `lobby:update` | serwer → host | Lista graczy (tylko host) |
| `question:intro` | serwer → wszyscy | Zapowiedź pytania przed startem timera |
| `question:start` | serwer → wszyscy | Host dostaje treść i odpowiedzi, gracze tylko liczbę odpowiedzi i limit czasu |
| `player:answer` | gracz → serwer | Tylko indeks pytania i odpowiedzi |
| `answer:progress` | serwer → host | Ile osób już odpowiedziało |
| `question:end` | serwer → wszyscy | Poprawna odpowiedź, rozkład odpowiedzi, ranking |
| `question:result` | serwer → gracz | Indywidualny wynik: trafiona, punkty, miejsce |
| `game:over` | serwer → wszyscy | Wyniki końcowe i statystyki (zamiast `game:end`) |
| `game:closed` | serwer → wszyscy | Gra zamknięta (host nie wrócił do lobby w ciągu 30 s lub brak graczy) |

Rozłączenie hosta w trakcie rozgrywki nie przerywa gry: timery działają dalej, a po `host:rejoin` host dostaje aktualny stan (lobby, intro, pytanie z pozostałym czasem, wyniki pytania).

## Testy

`npm test --prefix server` uruchamia testy jednostkowe logiki gry (punktacja, odrzucanie spóźnionych i podwójnych odpowiedzi, walidacja nicków, rozłączenia, statystyki, zapis wyniku) na wbudowanym runnerze `node:test`.
>>>>>>> Stashed changes
