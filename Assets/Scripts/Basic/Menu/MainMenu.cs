using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class MainMenu : MonoBehaviour {


    [SerializeField]
    private GameObject _loadingObject;

    [SerializeField]
    private List<GameObject> _falseObjects;


    // NEEDS DELEGATE. FIXING!
    [SerializeField]
    private RoundsSetUp _roundsSetUp;
    // NEEDS DELEGATE. FIXING!


    private bool _runOnce;

    void Start ()
    {
        _loadingObject.SetActive(false);
    }

    public void PlayGame()
    {
        StartCoroutine("PlayButton");
    }

   

    void Update()
    {
        AdjustRound();    
    }

    void AdjustRound()
    {

        if (Input.GetAxis(ControllerInputs.allhorizontal) < 0)
        {
            if (!_runOnce)
            {
                _roundsSetUp.MinRound--;
                print("Less");
                _runOnce = true;
            }

        }

        else if (Input.GetAxis(ControllerInputs.allhorizontal) > 0)
        {

            if (!_runOnce)
            {
                _roundsSetUp.AddRound++;
                print("More");
                _runOnce = true;
            }

        }

        else
        {
            _runOnce = false;
        }
    }

    private IEnumerator PlayButton()
    {
        foreach (GameObject falseobject in _falseObjects)
            falseobject.SetActive(false);

        _loadingObject.SetActive(true);

        yield return new WaitForSeconds(1);


        AsyncOperation async = Application.LoadLevelAsync("SceneFerry");


        while (!async.isDone)
        {
            _roundsSetUp.SaveResource();
            yield return null;
        }
    }
}
