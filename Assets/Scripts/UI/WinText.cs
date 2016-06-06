using UnityEngine;
using UnityEngine.UI;
using System.Collections;

public class WinText : MonoBehaviour {

    [SerializeField] private RoundManager _roundManager;
    [SerializeField] private PlayerScore _checkScore;

    [SerializeField] private GameObject _winText;


    void Awake()
    {
        _roundManager.OnGameEnd += ShowWinText;
    }

	void Start ()
    {
        _winText.SetActive(false);
	}

    private void ShowWinText()
    {
        _winText.SetActive(true);

        if (_checkScore.P1Score > _checkScore.P2Score && _checkScore.P1Score > _checkScore.P3Score && _checkScore.P1Score > _checkScore.P4Score)
            _winText.GetComponent<Text>().text = "P1 WINS \n \n" + "KILLS: " + _checkScore.P1Score + "\n DEATHS: " + (_checkScore.P2Score + _checkScore.P3Score + _checkScore.P4Score);
        else if (_checkScore.P2Score > _checkScore.P1Score && _checkScore.P2Score > _checkScore.P3Score && _checkScore.P2Score > _checkScore.P4Score)
            _winText.GetComponent<Text>().text = "P2 WINS \n \n" + "KILLS: " + _checkScore.P2Score + "\n DEATHS: " + (_checkScore.P1Score + _checkScore.P3Score + _checkScore.P4Score);
        else if (_checkScore.P3Score > _checkScore.P1Score && _checkScore.P3Score > _checkScore.P2Score && _checkScore.P3Score > _checkScore.P4Score)
            _winText.GetComponent<Text>().text = "P3 WINS \n \n" + "KILLS: " + _checkScore.P3Score + "\n DEATHS: " + (_checkScore.P2Score + _checkScore.P1Score + _checkScore.P4Score);
        else if (_checkScore.P4Score > _checkScore.P1Score && _checkScore.P4Score > _checkScore.P2Score && _checkScore.P4Score > _checkScore.P3Score)
            _winText.GetComponent<Text>().text = "P4 WINS \n \n" + "KILLS: " + _checkScore.P4Score + "\n DEATHS: " + (_checkScore.P2Score + _checkScore.P3Score + _checkScore.P1Score);

    }
}
