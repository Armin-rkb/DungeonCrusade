using UnityEngine;
using System.Collections;

public class MusicNoteHolder : MonoBehaviour, IWeapon
{
    public delegate void MusicNoteEventHandler();
    public MusicNoteEventHandler OnMusicNoteShoot;


    [SerializeField] private MusicNote[] musicnote;
    [SerializeField] private PlayerCollision playerCollision;
    [SerializeField] private PlayerFlip flip;
    [SerializeField] private PlayerMovement playernumber;

    public void Shoot()
    {
        if (flip.facingRight)
            StartCoroutine(SpawnRight());

        else
            StartCoroutine(SpawnLeft());
    }

    IEnumerator SpawnRight()
    {
        for (int j = 0; j < musicnote.Length; j++)
        {
            if (OnMusicNoteShoot != null)
                OnMusicNoteShoot();

            MusicNote currMusicNote = Instantiate(musicnote[j], new Vector2(transform.position.x + .5f, transform.position.y), musicnote[j].transform.rotation) as MusicNote;
            Physics2D.IgnoreCollision(currMusicNote.GetComponent<Collider2D>(), musicnote[j].GetComponent<Collider2D>());
            currMusicNote.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currMusicNote.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currMusicNote.GetComponent<MusicNote>().ShootRight();
            yield return new WaitForSeconds(0.1f);
        }
    }

    IEnumerator SpawnLeft()
    {
        for (int j = 0; j < musicnote.Length; j++)
        {
            if (OnMusicNoteShoot != null)
                OnMusicNoteShoot();

            MusicNote currMusicNote = Instantiate(musicnote[j], new Vector2(transform.position.x - .5f, transform.position.y + 0.3f), Quaternion.Inverse(musicnote[j].transform.rotation)) as MusicNote;
            Physics2D.IgnoreCollision(currMusicNote.GetComponent<Collider2D>(), musicnote[j].GetComponent<Collider2D>());
            currMusicNote.gameObject.GetComponent<BulletNumber>().playernum = playernumber.PlayerNumber;

            for (int i = 0; i < playerCollision._ignoredColl.Length; i++)
            {
                Physics2D.IgnoreCollision(currMusicNote.GetComponent<Collider2D>(), playerCollision._ignoredColl[i]);
            }
            currMusicNote.GetComponent<MusicNote>().ShootLeft();
            yield return new WaitForSeconds(0.15f);
        }
    }
}
