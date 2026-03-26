# ima-skills-rank

ClawHub search ranking tracker for IMA Studio skills.

**Dashboard:** [ima-skills-rank.wulong.dev](https://ima-skills-rank.wulong.dev)

## How it works

- A GitHub Actions cron job runs daily, querying [ClawHub](https://clawhub.com) search API for configured keywords
- Results are stored as JSON snapshots in `data/`
- A [Cloudflare Worker](https://ima-skills-rank.wulong.dev) serves the dashboard, reading data via [api.wulong.dev](https://api.wulong.dev/ima-rank/v1)

## API

| Endpoint | Description |
|----------|-------------|
| `GET /ima-rank/v1/config` | Monitoring configuration |
| `GET /ima-rank/v1/index` | List available snapshot dates |
| `GET /ima-rank/v1/snapshot?date=latest` | Latest ranking snapshot |
| `GET /ima-rank/v1/snapshot?date=YYYY-MM-DD` | Historical snapshot |

## Configuration

Edit `data/config.json` to add/remove skills or keywords. Changes take effect on the next cron run.

## License

MIT
