const response = await fetch("http://localhost:3000/certificate-batches", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    organizationName: "River Street Learning Fund",
    participants: [
      {
        participantId: "p-1042",
        name: "Jordan Lee",
        programName: "Community Garden Leadership",
        completed: true,
        completionDate: "2026-08-28",
        donorAmount: 75,
        volunteerHours: 18,
        campaign: "summer-garden"
      },
      {
        participantId: "p-1043",
        name: "Sam Rivera",
        programName: "Community Garden Leadership",
        completed: false,
        completionDate: "2026-09-30",
        donorAmount: 0,
        volunteerHours: 7,
        campaign: "summer-garden"
      }
    ]
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
if (!response.ok) process.exitCode = 1;
