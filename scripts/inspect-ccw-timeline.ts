import { getCcwTimelineForCounty } from "@/lib/ccw-timeline-db";
import { prisma } from "@/lib/db";

async function main() {
  for (const slug of ["los-angeles", "orange", "alameda", "riverside", "san-diego"]) {
    const d = await getCcwTimelineForCounty(slug);
    console.log(`\n=== ${slug} (${d.countyDisplayName}) ===`);
    console.log("last submitted:", d.lastTimelineSubmittedCounty);
    for (const p of d.processes) {
      console.log(
        `  ${p.process.padEnd(13)} count=${p.submissionCount} median=${p.avgDays ?? "-"} min=${
          p.rangeMin ?? "-"
        } max=${p.rangeMax ?? "-"}`
      );
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
