using UnityEngine;
using System.Collections;

public class StartScreen : MonoBehaviour {

    public delegate void StartLoadingEventHandler();

    public StartLoadingEventHandler StartLoading;

    /*
	 * Waarom zijn delegates & events handig?
	 * - ze kunnen je helpen met het switchen tussen states
	 * - super handig voor herbruikbaarheid
	 * - ze helpen je met encapsulation. Je brengt meer een API aan in je code en daardoor wordt je code meer 'loosely coupled'
	 * */

    [SerializeField] int seconds;

    void Update()
    {
        CheckInput();
    }

    void CheckInput()
    {
        if (Input.GetKeyDown(KeyCode.KeypadEnter))
        {
            StartCoroutine("LeaveMenu");
        }
    }

    IEnumerator LeaveMenu()
    {
        if (StartLoading != null)
            StartLoading();

        yield return new WaitForSeconds(seconds);

        AsyncOperation async = Application.LoadLevelAsync("Menu");
        

        while (!async.isDone)
        {
            yield return null;
        }

    }
}
