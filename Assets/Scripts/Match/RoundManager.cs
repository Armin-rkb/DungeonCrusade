using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;


public class RoundManager : MonoBehaviour {

    //int
    private int _amountOfRounds = 1;
    //int

    //List
    [SerializeField]
    private List<GameObject> _roundObjects;
    //List

    //Scripts
    private PlayerScore _checkScore;
    //Scripts
    

    /*
     * 0 = Round Object for a new round.
     * 1 = Standard round object.
     */

    //Text
    private Text _roundText;

  
  //[SerializeField]
    //private Text _scoreText;
    //Text

    //GameObject
    [SerializeField]
    private GameObject _winText;
    //GameObject

    //Scripts
    [SerializeField]
    private MatchStart _matchStart;
    private RoundsSetUp _roundSetUp;
    //Scripts

	void Start () 
    {

        _winText.SetActive(false);
        _roundSetUp = this.GetComponent<RoundsSetUp>();

        foreach (GameObject roundobj in _roundObjects)
            _roundText = roundobj.GetComponent<Text>();

        _roundText.text = "Round " + _amountOfRounds;

        _roundObjects[0].SetActive(false);   
	}

    void Update ()
    {
        StopMatch();
    }

    private void StopMatch()
    {
        if (_amountOfRounds > _roundSetUp.Round)
            StartCoroutine("StopGame");
    }

    public IEnumerator AddRound()
    {

        _amountOfRounds++;


            foreach (GameObject roundobj in _roundObjects)
                _roundText = roundobj.GetComponent<Text>();


            _roundObjects[1].SetActive(false);

            if (_amountOfRounds <= _roundSetUp.Round)
            {
            

            _roundObjects[0].SetActive(true);

            _checkScore = GameObject.FindGameObjectWithTag(GameTags.player).GetComponent<PlayerScore>();

           


            yield return new WaitForSeconds(2);

            //_scoreText.text = _checkScore.P1Score + " - " + _checkScore.P2Score;


            _roundObjects[0].SetActive(false);
            _roundObjects[1].SetActive(true);

            _matchStart.StartCoroutine("StartNewRound");
            }
            _roundText.text = "Round " + _amountOfRounds;

           
    }

    private IEnumerator StopGame()
    {
        _checkScore = GameObject.FindGameObjectWithTag(GameTags.player).GetComponent<PlayerScore>();

        _winText.SetActive(true);

        if (_checkScore.P1Score > _checkScore.P2Score)
            _winText.GetComponent<Text>().text = "P1 WINS \n \n" + "KILLS: " + _checkScore.P1Score + "\n DEATHS: " + _checkScore.P2Score;
        else
            _winText.GetComponent<Text>().text = "P2 WINS \n \n" + "KILLS: " + _checkScore.P2Score + "\n DEATHS: " + _checkScore.P1Score;

        yield return new WaitForSeconds(3);
        Application.LoadLevel("Menu");
    }
}
