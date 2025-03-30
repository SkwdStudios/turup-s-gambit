"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/card"
import { X, Download } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ReplaySummaryProps {
  onClose: () => void
  replayData: any[]
}

export function ReplaySummary({ onClose, replayData }: ReplaySummaryProps) {
  // If no replay data, show placeholder
  if (!replayData || replayData.length === 0) {
    return (
      <div className="h-full flex flex-col border-2 border-primary/30 rounded-lg bg-card/80 backdrop-blur-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-medieval text-primary">Game Replay</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">No replay data available</p>
        </div>
      </div>
    )
  }

  // Mock replay data for demonstration
  const mockReplayData = [
    { type: "gameStart", trump: "hearts", players: ["You", "Sir Lancelot", "Lady Guinevere", "Merlin"] },
    { type: "playCard", player: "You", card: { suit: "hearts", value: "A" } },
    { type: "playCard", player: "Sir Lancelot", card: { suit: "hearts", value: "K" } },
    { type: "playCard", player: "Lady Guinevere", card: { suit: "hearts", value: "Q" } },
    { type: "playCard", player: "Merlin", card: { suit: "hearts", value: "J" } },
    {
      type: "trickComplete",
      winner: "You",
      cards: [
        { suit: "hearts", value: "A" },
        { suit: "hearts", value: "K" },
        { suit: "hearts", value: "Q" },
        { suit: "hearts", value: "J" },
      ],
    },
    { type: "playCard", player: "You", card: { suit: "spades", value: "A" } },
    { type: "playCard", player: "Sir Lancelot", card: { suit: "spades", value: "2" } },
    { type: "playCard", player: "Lady Guinevere", card: { suit: "spades", value: "K" } },
    { type: "playCard", player: "Merlin", card: { suit: "hearts", value: "2" } },
    {
      type: "trickComplete",
      winner: "Merlin",
      cards: [
        { suit: "spades", value: "A" },
        { suit: "spades", value: "2" },
        { suit: "spades", value: "K" },
        { suit: "hearts", value: "2" },
      ],
    },
    { type: "gameEnd", winners: ["You", "Lady Guinevere"], score: "7-6" },
  ]

  const data = mockReplayData

  // Group data by type for the new all-at-once view
  const gameInfo = data.find((item) => item.type === "gameStart")
  const gameEnd = data.find((item) => item.type === "gameEnd")
  const tricks = data.filter((item) => item.type === "trickComplete")
  const cardPlays = data.filter((item) => item.type === "playCard")

  return (
    <div className="h-full flex flex-col border-2 border-primary/30 rounded-lg bg-card/80 backdrop-blur-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-medieval text-primary">Game Replay</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="medieval-button">
            <Download size={16} className="mr-2" />
            Export
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="flex-1 flex flex-col">
        <TabsList className="self-center mb-6">
          <TabsTrigger value="summary" className="font-medieval">
            Summary
          </TabsTrigger>
          <TabsTrigger value="tricks" className="font-medieval">
            Tricks
          </TabsTrigger>
          <TabsTrigger value="players" className="font-medieval">
            Players
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-lg border border-primary/20">
              <h3 className="text-xl font-medieval mb-4">Game Details</h3>
              {gameInfo && (
                <div className="space-y-2">
                  <p>
                    <span className="font-medium">Trump Suit:</span>{" "}
                    <span className="font-medieval">{gameInfo.trump}</span>
                  </p>
                  <p>
                    <span className="font-medium">Players:</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {gameInfo.players.map((player: string, index: number) => (
                      <div key={index} className="bg-card/50 p-2 rounded">
                        {player}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gameEnd && (
                <div className="mt-6">
                  <p>
                    <span className="font-medium">Final Score:</span>{" "}
                    <span className="font-medieval">{gameEnd.score}</span>
                  </p>
                  <p>
                    <span className="font-medium">Winners:</span>{" "}
                    <span className="font-medieval">{gameEnd.winners.join(" & ")}</span>
                  </p>
                  <div className="mt-4 p-4 bg-primary/20 rounded-lg inline-block">
                    <p className="font-medieval text-2xl text-primary">Victory!</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-card/50 backdrop-blur-sm p-6 rounded-lg border border-primary/20">
              <h3 className="text-xl font-medieval mb-4">Game Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2">Tricks Won:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {gameInfo?.players.map((player: string) => {
                      const tricksWon = tricks.filter((t) => t.winner === player).length
                      return (
                        <div key={player} className="flex justify-between items-center bg-card/50 p-2 rounded">
                          <span>{player}</span>
                          <span className="font-medieval text-lg">{tricksWon}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="font-medium mb-2">Cards Played:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {gameInfo?.players.map((player: string) => {
                      const cardsPlayed = cardPlays.filter((c) => c.player === player).length
                      return (
                        <div key={player} className="flex justify-between items-center bg-card/50 p-2 rounded">
                          <span>{player}</span>
                          <span className="font-medieval text-lg">{cardsPlayed}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tricks" className="flex-1 overflow-auto">
          <div className="space-y-6">
            {tricks.map((trick, index) => (
              <div key={index} className="bg-card/50 backdrop-blur-sm p-6 rounded-lg border border-primary/20">
                <h3 className="text-xl font-medieval mb-4">Trick {index + 1}</h3>
                <p className="mb-4">
                  Winner: <span className="font-medieval">{trick.winner}</span>
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {trick.cards.map((card: any, cardIndex: number) => (
                    <Card key={cardIndex} suit={card.suit} value={card.value} onClick={() => {}} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="players" className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gameInfo?.players.map((player: string) => {
              const playerCards = cardPlays.filter((c) => c.player === player).map((c) => c.card)

              return (
                <div key={player} className="bg-card/50 backdrop-blur-sm p-6 rounded-lg border border-primary/20">
                  <h3 className="text-xl font-medieval mb-4">{player}</h3>
                  <p className="mb-2">Cards Played:</p>
                  <div className="flex flex-wrap gap-2">
                    {playerCards.map((card: any, cardIndex: number) => (
                      <Card key={cardIndex} suit={card.suit} value={card.value} onClick={() => {}} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

