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
    [SerializeField]
    private PlayerScore _checkScore;
    //Scripts
    

    /*
     * 0 = Round Object for a new round.
     * 1 = Standard round object.
     */

    //Text
    private Text _roundText;

  
  [SerializeField]
    private Text _scoreText;
    //Text

    //GameObject
    [SerializeField]
    private GameObject _winText;

    [SerializeField]
    private GameObject[] _buttonObjects;
    //GameObject

    //GameObject
    [SerializeField]
    private GameObject _extendedText;
    //GameObject

    //Scripts
    [SerializeField]
    private MatchStart _matchStart;
    private RoundsSetUp _roundSetUp;
    //Scripts

    [SerializeField]
    private AudioSource levelOST;

    bool runOnce;

	void Start () 
    {
        _winText.SetActive(false);
        _extendedText.SetActive(false);

        _roundSetUp = this.GetComponent<RoundsSetUp>();
        _scoreText.text = _checkScore.P1Score + " - " + _checkScore.P2Score;

        foreach (GameObject roundobj in _roundObjects)
            _roundText = roundobj.GetComponent<Text>();

        foreach (GameObject button in _buttonObjects)
            button.SetActive(false);

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
            StopGame();
    }

    private void ExtendMatch()
    {
        if (_amountOfRounds >= 3)
        {
            if (_checkScore.P1Score == _checkScore.P2Score || _checkScore.P2Score == _checkScore.P1Score)
            {
                _extendedText.SetActive(true);
                _roundSetUp.AddRound += 1;
                _scoreText.color = new Color(255, 0, 0);
            }
            else
                _scoreText.color = new Color(255, 255, 255);

        }
            
    }

    public IEnumerator AddRound()
    {
        _amountOfRounds++;
        _scoreText.text = _checkScore.P1Score + " - " + _checkScore.P2Score;

            foreach (GameObject roundobj in _roundObjects)
                _roundText = roundobj.GetComponent<Text>();


            _roundObjects[1].SetActive(false);

            if (_amountOfRounds <= _roundSetUp.Round)
            {
            _roundObjects[0].SetActive(true);

            yield return new WaitForSeconds(2);

            


            _roundObjects[0].SetActive(false);
            _roundObjects[1].SetActive(true);

            ExtendMatch();

            _matchStart.StartCoroutine("StartNewRound");
            }


            _roundText.text = "Round " + _amountOfRounds;
            _scoreText.text = _checkScore.P1Score + " - " + _checkScore.P2Score;


           
            yield return new WaitForSeconds(1);
            _extendedText.SetActive(false);
    }

    private void StopGame()
    {
      

        if (!runOnce)
        {
            levelOST.Stop();
            SoundManager.PlayAudioClip(11);

            foreach (GameObject button in _buttonObjects)
                button.SetActive(true);

            _scoreText.text = _checkScore.P1Score + " - " + _checkScore.P2Score;

            _winText.SetActive(true);

            if (_checkScore.P1Score > _checkScore.P2Score)
                _winText.GetComponent<Text>().text = "P1 WINS \n \n" + "KILLS: " + _checkScore.P1Score + "\n DEATHS: " + _checkScore.P2Score;
            else
                _winText.GetComponent<Text>().text = "P2 WINS \n \n" + "KILLS: " + _checkScore.P2Score + "\n DEATHS: " + _checkScore.P1Score;

            runOnce = true;
        }
    }
}
