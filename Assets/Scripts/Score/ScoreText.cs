using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class ScoreText : MonoBehaviour {

    [SerializeField]
    private PlayerScore _playerScore;

    [SerializeField]
    private List<Text> _playerScoreTexts;

    /*
     * 0 = P1 Score Text
     * 1 = P2 Score Text
     * 2 = P3 Score Text
     * 3 = P4 Score Text
     */

    void Start()
    {
        _playerScore.P1ScoreText += UpdateP1ScoreText;
        _playerScore.P2ScoreText += UpdateP2ScoreText;
        _playerScore.P3ScoreText += UpdateP3ScoreText;
        _playerScore.P4ScoreText += UpdateP4ScoreText;
    }

    void UpdateP1ScoreText()
    {
        _playerScoreTexts[0].text = "Score: " + _playerScore.P1Score;
    }

    void UpdateP2ScoreText()
    {
        _playerScoreTexts[0].text = "Score: " + _playerScore.P2Score;
    }

    void UpdateP3ScoreText()
    {
        _playerScoreTexts[0].text = "Score: " + _playerScore.P3Score;
    }

    void UpdateP4ScoreText()
    {
        _playerScoreTexts[0].text = "Score: " + _playerScore.P4Score;
    }


}
