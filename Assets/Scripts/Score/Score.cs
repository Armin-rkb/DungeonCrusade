using UnityEngine;
using System.Collections;

public class Score : MonoBehaviour {

    int score = 1;


    void Start()
    {
        HealthPlayer.OnPlayerDeath += AddScore;
    }

    private void AddScore(HealthPlayer player)
    {
        score += player.PlayerCurrency;
        print(score);
    }
}
