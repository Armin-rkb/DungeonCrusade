using UnityEngine;
using System.Collections;
using System.Collections.Generic;


public class PlayerScore : MonoBehaviour {

    public delegate void OnPointEventHandler();
    public OnPointEventHandler P1ScoreText;
    public OnPointEventHandler P2ScoreText;
    public OnPointEventHandler P3ScoreText;
    public OnPointEventHandler P4ScoreText;

    int p1Score = 0;
    int p2Score = 0;

    int p3Score = 0;
    int p4Score = 0;


    /*
     * These values will keep track of the player's score.
     * They will both be stored as an integer.
     */

    public int P1Score
    {
        get { return p1Score; }
    }

    public int P2Score
    {
        get { return p2Score; }
    }

    public int P3Score
    {
        get { return p3Score; }
    }

    public int P4Score
    {
        get { return p4Score; }
    }
   /*
    * We need these values for our other scripts.
    * We only change these integers in this script, 
    * so we only use a 'get'.
    */


    void Start()
    {
        HealthPlayer.OnP1Death += AddScoreP1;
        HealthPlayer.OnP2Death += AddScoreP2;

        HealthPlayer.OnP3Death += AddScoreP3;
        HealthPlayer.OnP4Death += AddScoreP4;
    }

    /*
     * Adding functions to the delegate located in HealthPlayer.
     */

    private void AddScoreP1(HealthPlayer player)
    {
        p1Score += player.PlayerPoint;

        if (P1ScoreText != null)
            P1ScoreText();
    }

    // Adds a point to P1.

    private void AddScoreP2(HealthPlayer player)
    {
        p2Score += player.PlayerPoint;

        if (P2ScoreText != null)
            P2ScoreText();
    }

    // Adds a point to P2.

    private void AddScoreP3(HealthPlayer player)
    {
        p3Score += player.PlayerPoint;

        if (P3ScoreText != null)
            P3ScoreText();
    }

    // Adds a point to P3.

    private void AddScoreP4(HealthPlayer player)
    {
        p4Score += player.PlayerPoint;

        if (P4ScoreText != null)
            P4ScoreText();
    }

    // Adds a point to P4.
}
