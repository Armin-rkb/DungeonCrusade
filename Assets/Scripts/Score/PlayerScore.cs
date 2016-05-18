using UnityEngine;
using System.Collections;
using System.Collections.Generic;


public class PlayerScore : MonoBehaviour {

    int p1Score = 0;
    int p2Score = 0;


    public int P1Score
    {
        get { return p1Score; }
    }

    public int P2Score
    {
        get { return p2Score; }
    }


    void Start()
    {
        HealthPlayer.OnP1Death += AddScoreP1;
        HealthPlayer.OnP2Death += AddScoreP2;
    }

    private void AddScoreP1(HealthPlayer player)
    {
        p1Score += player.PlayerPoint;
        print("P1 SCORE");
    }

    private void AddScoreP2(HealthPlayer player)
    {
        p2Score += player.PlayerPoint;
        print("P2 SCORE");
    }
}
