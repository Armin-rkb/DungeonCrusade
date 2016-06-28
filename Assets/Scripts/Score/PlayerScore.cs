using UnityEngine;
using System.Collections;
using System.Collections.Generic;


public class PlayerScore : MonoBehaviour {

    public delegate void OnPointEventHandler();
    public delegate void OnScoreEventHandler();

    public OnPointEventHandler P1ScoreText;
    public OnPointEventHandler P2ScoreText;
    public OnPointEventHandler P3ScoreText;
    public OnPointEventHandler P4ScoreText;

    public OnScoreEventHandler OnPlayerScore;

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
        PlayerDetectHit.AddP1Score += AddScoreP1;
        PlayerDetectHit.AddP2Score += AddScoreP2;

        PlayerDetectHit.AddP3Score += AddScoreP3;
        PlayerDetectHit.AddP4Score += AddScoreP4;
    }

    /*
     * Adding functions to the delegate located in HealthPlayer.
     */

    private void AddScoreP1(PlayerDetectHit player)
    {
        p1Score += 1;

        if (P1ScoreText != null)
            P1ScoreText();

        if (OnPlayerScore != null)
            OnPlayerScore();
    }

    // Adds a point to P1.

    private void AddScoreP2(PlayerDetectHit player)
    {
       p2Score += 1;

        if (P2ScoreText != null)
            P2ScoreText();

        if (OnPlayerScore != null)
            OnPlayerScore();
    }

    // Adds a point to P2.

    private void AddScoreP3(PlayerDetectHit player)
    {
        p3Score += 1;

        if (P3ScoreText != null)
            P3ScoreText();

        if (OnPlayerScore != null)
            OnPlayerScore();
    }

    // Adds a point to P3.

    private void AddScoreP4(PlayerDetectHit player)
    {
        p4Score += 1;

        if (P4ScoreText != null)
            P4ScoreText();

        if (OnPlayerScore != null)
            OnPlayerScore();
    }

    // Adds a point to P4.


    void OnDestroy()
    {
        PlayerDetectHit.AddP1Score -= AddScoreP1;
        PlayerDetectHit.AddP2Score -= AddScoreP2;

        PlayerDetectHit.AddP3Score -= AddScoreP3;
        PlayerDetectHit.AddP4Score -= AddScoreP4;
    }
}
